# StudyFlow AI

Premium SaaS-style AI-powered study planner and collaboration platform built with Next.js App Router, Supabase, Tailwind CSS, Framer Motion, and OpenAI.

## Features

- Secure authentication with Supabase Auth (signup/login/email verification/forgot password/logout)
- Profile system with academic metadata, goals, streak, and daily targets
- Study planner with task creation, priorities, statuses, deadline tracking, search/filter
- Realtime study rooms and live chat using Supabase Realtime
- File upload/preview/delete with Supabase Storage
- AI Studio:
  - AI timetable generation
  - AI goal/task breakdown
  - AI productivity summary
- Analytics dashboard with progress cards and charts
- Command palette (`Ctrl/Cmd + K`), dark mode, responsive UI, and quick actions
- Route protection and RLS-ready database/schema setup

## Tech Stack

- Frontend: Next.js 16 (App Router), Tailwind CSS, Framer Motion, Recharts
- Backend: Supabase (Auth, Postgres, Realtime, Storage)
- AI: OpenAI API
- Deployment: Vercel

## Project Structure

```txt
app/
  (auth)/
  (dashboard)/
  api/ai/
components/
hooks/
lib/
services/
supabase/
utils/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

3. Run local dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Supabase Setup

1. Create a Supabase project.
2. In SQL Editor, run:
   - `supabase/schema.sql`
   - `supabase/storage.sql`
3. In Authentication settings:
   - Enable email/password provider
   - Configure email templates and verification
   - Add redirect URL: `http://localhost:3000/auth/callback`
4. In Realtime settings:
   - Enable realtime for `messages` and `study_rooms` tables.

## AI Integration

AI endpoints are in:

- `app/api/ai/timetable/route.ts`
- `app/api/ai/breakdown/route.ts`
- `app/api/ai/summary/route.ts`

All endpoints call OpenAI via `lib/ai.ts` and expect `OPENAI_API_KEY`.

## Security

- Protected dashboard routes via `middleware.ts`
- Supabase row-level security policies in `supabase/schema.sql`
- Storage access policies in `supabase/storage.sql`
- Client/server Supabase separation (`supabase/client.ts`, `supabase/server.ts`)

## Deployment (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. Deploy

## Notes

- This project is production-oriented starter architecture for a startup-style EdTech SaaS.
- Extend with Stripe billing, team permissions, and calendar APIs for full commercial rollout.
