# MoneyTrail

A personal finance tracker built with React, Vite, and Tailwind CSS.

## Development

You need Node.js (18+) and npm.

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` (already done in this project with working values)
with your own Supabase project's URL and publishable key before running the app.

## Build

```sh
npm run build
npm run preview
```

## Built with

- React + React Router DOM
- Vite
- Tailwind CSS
- Supabase (auth + database)
- shadcn/ui-style components on Radix UI
- Recharts
- React Hook Form + Zod

## Account deletion

Deleting an account needs Supabase's service-role key, which can never live in
a client-side app. This is handled by a Supabase Edge Function instead — see
`supabase/functions/delete-account/`. Deploy it once with:

```sh
supabase functions deploy delete-account
```
