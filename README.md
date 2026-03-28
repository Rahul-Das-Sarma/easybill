# EasyBill

Simple invoice tooling for Indian small businesses: GST line items, customers, drafts, and payments—built as a Next.js app on Supabase (Auth + Postgres) with Prisma.

## Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router, `src/app`)
- **UI:** Tailwind CSS, [shadcn](https://ui.shadcn.com/)-style components, [Base UI](https://base-ui.com/)
- **Auth & DB:** [Supabase](https://supabase.com/) Auth; PostgreSQL via **Prisma ORM 7** (`@prisma/adapter-pg`)
- **Forms & validation:** React Hook Form, Zod
- **Server state:** TanStack Query

## Prerequisites

- Node.js 20+ (see [Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) notes)
- A [Supabase](https://supabase.com/) project
- `DATABASE_URL` pointed at the same Postgres Supabase uses (direct / session pooler on port **5432** is best for migrations)

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Publishable (public) key—safe for the browser; RLS still applies |
| `DATABASE_URL` | Postgres connection string for Prisma (Settings → Database) |

Optional: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still read as a fallback if the publishable key is not set.

## Database

Prisma config and migrations live under `prisma/`. SQL migrations include **Row Level Security** policies for Supabase (`authenticated` + `auth.uid()`).

```bash
npm install
npx prisma generate
npm run db:migrate
```

Use `npm run db:studio` to inspect data locally.

Ensure `public.users.id` matches Supabase Auth user IDs. The app **upserts** a `users` row on first API use (`ensureAppUser`) so foreign keys from `customers` / `invoices` work.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:push` | Push schema without migration files (dev only) |
| `npm run db:studio` | Prisma Studio |

## App routes (overview)

| Path | Description |
|------|-------------|
| `/` | Marketing / landing |
| `/login` | Email sign-in and sign-up (Supabase) |
| `/dashboard` | Overview (placeholders for charts / recent activity) |
| `/invoices` | Paginated list, search, filters, quick actions |
| `/invoices/create` | Create draft invoice (line items, GST, customer search or inline create) |
| `/invoices/[id]` | Invoice detail (placeholder sections) |
| `/invoices/[id]/edit` | Edit flow (placeholder) |
| `/customers`, `/customers/[id]` | Customers (placeholder / list shell) |
| `/settings` | Business profile (placeholder) |

API routes under `src/app/api/` back invoices, customers, mark-paid, and a stub PDF endpoint.

## Deploy (e.g. Vercel)

1. Set the same environment variables in the host dashboard.
2. Run `npm run db:migrate` against production (or run migrations in CI before deploy).
3. Build command: `npm run build` (already runs `prisma generate`).

## License

Private / unlicensed unless you add one.
