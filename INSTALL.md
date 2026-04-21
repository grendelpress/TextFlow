# TextFlow – Self-Hosted Install Guide

This guide walks you through standing up your own copy of TextFlow on your own Supabase project in about 10 minutes.

## Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- A [SignalWire](https://signalwire.com) account (optional for initial setup, required for SMS)

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Choose a name, a strong database password, and a region near your users.
3. Wait for the project to finish provisioning (usually under a minute).

## 2. Install the database schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Click **New query**.
3. Open `supabase/install.sql` from this repo, copy the entire file, and paste it into the editor.
4. Click **Run**.

The script is idempotent — re-running it is safe and will not destroy existing data.

After it finishes, open **Table Editor** and confirm you see these six tables:

| Table | Description |
|-------|-------------|
| `profiles` | One row per user — stores business info and SignalWire credentials |
| `phone_numbers` | SignalWire numbers owned by a user |
| `messages` | Full inbound/outbound SMS log |
| `webhooks` | Outbound webhook configurations |
| `opt_outs` | STOP/START compliance tracking |
| `message_templates` | Reusable SMS templates with placeholder support |

Each table should have RLS enabled (shield icon in the table list).

## 3. Configure environment variables

`.env` is gitignored and must be created manually in the project root. A template is provided:

```bash
cp .env.example .env
```

1. In the Supabase dashboard, open **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Fill in the values in your `.env` file:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

## 4. Deploy the edge functions (required for SMS)

TextFlow includes two edge functions:

- `signalwire-proxy` — proxies SignalWire API calls so your API token never touches the browser
- `sms-webhook` — receives inbound SMS webhooks from SignalWire and writes them to the database

Deploy them with the Supabase CLI:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy signalwire-proxy
supabase functions deploy sms-webhook --no-verify-jwt
```

`sms-webhook` must be deployed with `--no-verify-jwt` because SignalWire calls it without a Supabase JWT.

## 5. Install dependencies and run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173), sign up with an email and password, and you will be taken through the setup wizard to enter your SignalWire credentials.

## 6. Configure SignalWire (after first login)

Once through the setup wizard:

1. In the SignalWire dashboard, navigate to your phone number's messaging settings.
2. Set the **Message Received** webhook URL to:
   ```
   https://YOUR-PROJECT.supabase.co/functions/v1/sms-webhook
   ```
3. Set the method to **POST**.

Inbound messages will now appear in the Messages page in real time.

## Compliance and Opt-Outs

TextFlow automatically handles STOP and START replies:

- A **STOP** reply opts the contact out and records it in `opt_outs`.
- A **START** reply re-enables them.
- The Compliance page lets you view, manually add, or remove opt-outs.

## Message Templates and Placeholders

Templates support `{{variable_name}}` syntax. When you use a template in the compose window or reply bar, the UI will block sending and show a warning if any placeholder is still unfilled.

## Troubleshooting

**"Database error saving new user" on signup**
The `handle_new_user` trigger is missing or failed. Re-run `supabase/install.sql` in the SQL editor.

**"Configuration required" screen on load**
`VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing from `.env`, or the dev server was started before you created the file. Add the values and restart `npm run dev`.

**RLS errors like "new row violates row-level security policy"**
You are signed out, or `user_id` is not being populated correctly. Sign in and retry. If the issue persists, re-run `install.sql` to ensure all policies are applied.

**Inbound SMS not appearing**
Confirm the SignalWire webhook URL points to `https://YOUR-PROJECT.supabase.co/functions/v1/sms-webhook` and that the function was deployed with `--no-verify-jwt`.

**Messages send but status never updates to "delivered"**
SignalWire status callbacks require a publicly accessible `signalwire-proxy` function. Confirm the edge function is deployed and that your SignalWire project has the correct callback URL configured.
