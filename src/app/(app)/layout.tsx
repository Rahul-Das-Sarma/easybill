import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";

/**
 * Auth for `/dashboard`, `/invoices`, etc. is enforced in `src/middleware.ts`
 * (redirects unauthenticated users). Avoiding another `getUser()` + cookies read
 * here speeds up every client navigation; the sidebar loads the email on the client.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Providers>
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </Providers>
      </div>
    </div>
  );
}
