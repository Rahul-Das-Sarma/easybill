# EasyBill

Simple invoice tooling for Indian small businesses: GST line items, customers, drafts, and payments—built as a Next.js app on Supabase (Auth + Postgres) with Prisma.

## Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router, `src/app`)
- **UI:** Tailwind CSS, [shadcn](https://ui.shadcn.com/)-style components, [Base UI](https://base-ui.com/)
- **Auth & DB:** [Supabase](https://supabase.com/) Auth; PostgreSQL via **Prisma ORM 7** (`@prisma/adapter-pg`)
- **Forms & validation:** React Hook Form, Zod
- **Server state:** TanStack Query
- **PDF:** [@react-pdf/renderer](https://react-pdf.org/) (in-browser preview + server fallback), [Puppeteer](https://pptr.dev/) + [@sparticuz/chromium](https://github.com/Sparticuz/chromium) on Vercel for HTML→PDF; [Resend](https://resend.com/) for email with attachment

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
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: upload invoice PDFs to Storage and mint signed URLs (Settings → API → service_role) |
| `SUPABASE_INVOICE_PDF_BUCKET` | Private Storage bucket name (default `invoice-pdfs`) |
| `RESEND_API_KEY` | Send invoice emails with PDF attached |
| `RESEND_FROM_EMAIL` | Optional verified sender (default uses Resend onboarding address) |

Optional: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still read as a fallback if the publishable key is not set.

### Supabase Storage

Create a **private** bucket (e.g. `invoice-pdfs`). The app uploads PDFs to `{userId}/{invoiceId}.pdf` and stores `bucket/path` in `invoices.pdf_url`. Without `SUPABASE_SERVICE_ROLE_KEY`, PDFs still **download** from the API but are not uploaded.

## PDFs, WhatsApp, and email

- **Preview:** Invoice detail → **Preview PDF** opens a modal with `@react-pdf/renderer` (`GET /api/invoices/[id]/pdf-data`).
- **Download / server PDF:** `GET /api/invoices/[id]/pdf` builds HTML, prints with **Puppeteer** (Chromium from `@sparticuz/chromium` on Vercel, full `puppeteer` locally), and falls back to **React-PDF** if Puppeteer fails. Response is `application/pdf` and triggers upload when the service role is configured.
- **Free vs Pro:** PDF footer shows **“Powered by EasyBill”** for `users.plan = free`. **Pro** removes that line and shows the business logo in the footer only (logo in the header on free; pro uses footer branding per product spec).
- **WhatsApp:** Uses `GET /api/invoices/[id]/signed-pdf-url` (7-day signed URL by default). If no file exists yet and the service role is set, the handler generates and uploads the PDF first.
- **Email:** `POST /api/invoices/[id]/email` sends via Resend with the PDF attached (recipient = customer email or `{ "to": "..." }`).

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
| `/invoices/[id]` | Invoice detail, line items, payments, PDF preview / download / WhatsApp / email |
| `/invoices/[id]/edit` | Edit flow (placeholder) |
| `/customers`, `/customers/[id]` | Customers (placeholder / list shell) |
| `/settings` | Business profile (placeholder) |

API routes include invoices CRUD helpers, `pdf`, `pdf-data`, `signed-pdf-url`, `email`, customers, and mark-paid.

## Deploy (e.g. Vercel)

1. Set the same environment variables in the host dashboard.
2. Run `npm run db:migrate` against production (or run migrations in CI before deploy).
3. Build command: `npm run build` (already runs `prisma generate`).

## License

Private / unlicensed unless you add one.
