import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    userEmail = user.email ?? undefined;
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar email={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Providers>
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </Providers>
      </div>
    </div>
  );
}
