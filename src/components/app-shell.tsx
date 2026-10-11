"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <AppSidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background px-4 py-2 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
          <span className="text-sm font-semibold">EasyBill</span>
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
