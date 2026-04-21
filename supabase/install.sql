/*
  # TextFlow – Complete Database Install

  This script provisions everything TextFlow needs in a fresh Supabase project.
  It is idempotent: re-running it is safe and will not destroy existing data.

  ## What this installs

  1. Tables
     - `profiles`           – one row per authenticated user (mirrors auth.users)
     - `phone_numbers`      – SignalWire numbers owned by a user
     - `messages`           – inbound/outbound SMS log
     - `webhooks`           – outbound webhook configs per number
     - `opt_outs`           – STOP/START opt-out tracking
     - `message_templates`  – reusable SMS templates

  2. Automation
     - `handle_new_user()` trigger on `auth.users` auto-creates a profile
       row every time a user signs up, so signup never fails with
       "Database error saving new user"

  3. Security
     - Row Level Security is enabled on every table
     - Each table has minimum policies so users can only read/write their own data

  4. Performance
     - Indexes on common query paths (user_id, contact_phone, direction, created_at)
*/

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  signalwire_project_id text NOT NULL DEFAULT '',
  signalwire_api_token text NOT NULL DEFAULT '',
  signalwire_space text NOT NULL DEFAULT '',
  setup_completed boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'America/New_York',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  number text NOT NULL,
  friendly_name text NOT NULL DEFAULT '',
  signalwire_sid text NOT NULL DEFAULT '',
  capabilities jsonb NOT NULL DEFAULT '{"mms": false, "sms": true, "voice": false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number_id uuid REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  contact_phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','queued','sent','delivered','failed','received','undelivered')),
  signalwire_sid text NOT NULL DEFAULT '',
  segments integer NOT NULL DEFAULT 1,
  error_code text NOT NULL DEFAULT '',
  error_message text NOT NULL DEFAULT '',
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number_id uuid REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  name text NOT NULL,
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  secret text NOT NULL DEFAULT '',
  retry_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  last_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  opted_in_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'reply' CHECK (source IN ('reply','manual','import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone_number)
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('marketing','transactional','reminder','support')),
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS phone_numbers_user_id_idx
  ON public.phone_numbers (user_id);

CREATE INDEX IF NOT EXISTS messages_user_id_created_at_idx
  ON public.messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_contact_phone_idx
  ON public.messages (user_id, contact_phone);

CREATE INDEX IF NOT EXISTS messages_direction_idx
  ON public.messages (user_id, direction);

CREATE INDEX IF NOT EXISTS opt_outs_phone_idx
  ON public.opt_outs (user_id, phone_number);

-- ---------------------------------------------------------------------------
-- 3. New-user trigger (auto-create profile row on signup)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, contact_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opt_outs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- profiles ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- phone_numbers -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own phone numbers"   ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can insert own phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update own phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can delete own phone numbers" ON public.phone_numbers;

CREATE POLICY "Users can view own phone numbers"
  ON public.phone_numbers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone numbers"
  ON public.phone_numbers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers"
  ON public.phone_numbers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers"
  ON public.phone_numbers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- messages ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own messages"   ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- webhooks ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own webhooks"   ON public.webhooks;
DROP POLICY IF EXISTS "Users can insert own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users can update own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users can delete own webhooks" ON public.webhooks;

CREATE POLICY "Users can view own webhooks"
  ON public.webhooks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks"
  ON public.webhooks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON public.webhooks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON public.webhooks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- opt_outs ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own opt-outs"   ON public.opt_outs;
DROP POLICY IF EXISTS "Users can insert own opt-outs" ON public.opt_outs;
DROP POLICY IF EXISTS "Users can update own opt-outs" ON public.opt_outs;

CREATE POLICY "Users can view own opt-outs"
  ON public.opt_outs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opt-outs"
  ON public.opt_outs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opt-outs"
  ON public.opt_outs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- message_templates ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own templates"   ON public.message_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.message_templates;

CREATE POLICY "Users can view own templates"
  ON public.message_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.message_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.message_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.message_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
