"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import {
  InvoiceAddProductsPanel,
  type InvoiceLineAppend,
} from "./add-products-panel";

type Props = {
  onAppendLine: (line: InvoiceLineAppend) => void;
  onAppendBlank: () => void;
  disabled: boolean;
};

export function InvoiceAddItemsCard({
  onAppendLine,
  onAppendBlank,
  disabled,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-medium">Add items</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Use the tabs or add a blank row. After at least one line exists, the
          line items table appears below.
        </p>
      </div>

      <div className="mt-4">
        <InvoiceAddProductsPanel onAppendLine={onAppendLine} disabled={disabled} />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onAppendBlank}
        >
          <Plus className="mr-1 size-4" aria-hidden />
          Blank row
        </Button>
      </div>
    </div>
  );
}
