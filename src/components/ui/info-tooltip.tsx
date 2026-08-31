"use client";

import { Info } from "lucide-react";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type Coords = { top: number; left: number };

export function InfoTooltip({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top - 6,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onChange = () => updatePosition();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [open, updatePosition]);

  return (
    <>
      <span className={cn("inline-flex align-middle", className)}>
        <button
          ref={buttonRef}
          type="button"
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          aria-label="More information"
          aria-describedby={open ? tooltipId : undefined}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </span>
      {open && coords
        ? createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: "translate(-50%, -100%)",
              }}
              className="pointer-events-none z-9999 w-56 rounded-md border border-border bg-popover px-2.5 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-md"
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
