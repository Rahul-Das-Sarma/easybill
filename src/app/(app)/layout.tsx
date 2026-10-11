import { AppShell } from "@/components/app-shell";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import { Providers } from "@/components/providers";

/**
 * Auth for `/dashboard`, `/invoices`, etc. is enforced in `src/proxy.ts`
 * with Clerk. The sidebar reads the signed-in email on the client.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Providers>
        <AppShell>{children}</AppShell>
      </Providers>
      <SetupWizard />
    </>
  );
}
