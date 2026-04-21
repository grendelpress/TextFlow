# TextFlow

A self-hosted SMS platform built on Supabase and SignalWire. Send and receive text messages, manage multiple phone numbers, automate responses with templates, track opt-outs for compliance, and forward events to external systems via webhooks — all from a single web interface.

## Screenshots

![Welcome / Dashboard](public/Welcome.jpg)

![Messages](public/Messages.jpg)

## Features

- **Messaging** — Full two-way SMS conversations with real-time status tracking (queued, sent, delivered, failed)
- **Phone Numbers** — Manage multiple SignalWire numbers, each with its own friendly name and capabilities
- **Message Templates** — Create reusable templates with `{{placeholders}}`; the UI warns you before sending if any placeholder is still unfilled
- **Webhooks** — Forward inbound and outbound message events to any HTTP endpoint with optional shared secrets
- **Compliance** — Automatic STOP/START opt-out handling; manual opt-out management with full audit trail
- **Dashboard** — At-a-glance stats: message volume, delivery rates, active numbers, recent activity
- **Settings** — Business profile, SignalWire credentials, and timezone configuration
- **Setup Wizard** — Guided first-run flow that validates your SignalWire connection before going live

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| SMS Provider | SignalWire |
| Icons | Lucide React |

## Getting Started

See [INSTALL.md](./INSTALL.md) for full setup instructions.
