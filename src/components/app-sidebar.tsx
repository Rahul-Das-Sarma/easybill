"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  FlaskConical,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  manufacturerOnly?: boolean;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sell",
    items: [
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Stock",
    items: [
      { href: "/inventory", label: "Inventory", icon: Package },
      {
        href: "/recipes",
        label: "Recipes",
        icon: FlaskConical,
        manufacturerOnly: true,
      },
    ],
  },
  {
    label: "Tax",
    items: [{ href: "/returns", label: "Returns", icon: Landmark }],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function AppSidebar({
  open = false,
  onNavigate,
}: {
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const [isManufacturer, setIsManufacturer] = useState(false);

  useEffect(() => {
    function loadProfile() {
      void fetch("/api/me", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { isManufacturer?: boolean } | null) => {
          setIsManufacturer(Boolean(data?.isManufacturer));
        })
        .catch(() => {});
    }

    loadProfile();
    window.addEventListener("easybill:business-type", loadProfile);
    return () => window.removeEventListener("easybill:business-type", loadProfile);
  }, []);

  function handleSignOut() {
    void signOut({ redirectUrl: "/login" });
  }

  return (
    <aside
      className={cn(
        "flex h-dvh w-56 shrink-0 flex-col border-r border-border bg-card",
        "fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Receipt className="size-5 text-brand" aria-hidden />
        <span className="font-semibold tracking-tight">EasyBill</span>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
        {groups.map((group) => {
          const items = group.items.filter(
            (item) => !item.manufacturerOnly || isManufacturer,
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto shrink-0 border-t border-border p-2">
        {email ? (
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {email}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
