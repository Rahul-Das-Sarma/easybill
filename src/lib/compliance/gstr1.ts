export type Gstr1Invoice = {
  invoiceNumber: string;
  issueDate: string;
  buyerGstin: string | null;
  placeOfSupply: string | null;
  totalAmount: number;
  lines: {
    taxRate: number;
    taxableValue: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
  }[];
};

function filingPeriod(month: string) {
  const [year, mm] = month.split("-");
  return `${mm}${year}`;
}

function gstDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * GSTR-1 JSON in the offline-tool shape the GST portal accepts for upload.
 * B2B invoices are grouped by buyer GSTIN. Invoices without a GSTIN go to B2CS.
 */
export function buildGstr1(input: {
  gstin: string;
  month: string;
  invoices: Gstr1Invoice[];
}) {
  const b2b = new Map<
    string,
    {
      ctin: string;
      inv: {
        inum: string;
        idt: string;
        val: number;
        pos: string;
        rchrg: "N";
        inv_typ: "R";
        itms: {
          num: number;
          itm_det: {
            txval: number;
            rt: number;
            iamt: number;
            camt: number;
            samt: number;
          };
        }[];
      }[];
    }
  >();
  const b2cs = new Map<
    string,
    { sply_ty: "INTRA" | "INTER"; pos: string; rt: number; txval: number; iamt: number; camt: number; samt: number }
  >();

  for (const invoice of input.invoices) {
    const pos = invoice.placeOfSupply ?? "00";
    if (invoice.buyerGstin) {
      const group = b2b.get(invoice.buyerGstin) ?? {
        ctin: invoice.buyerGstin,
        inv: [],
      };
      group.inv.push({
        inum: invoice.invoiceNumber.slice(0, 16),
        idt: gstDate(invoice.issueDate),
        val: money(invoice.totalAmount),
        pos,
        rchrg: "N",
        inv_typ: "R",
        itms: invoice.lines.map((line, index) => ({
          num: index + 1,
          itm_det: {
            txval: money(line.taxableValue),
            rt: line.taxRate,
            iamt: money(line.igstAmount),
            camt: money(line.cgstAmount),
            samt: money(line.sgstAmount),
          },
        })),
      });
      b2b.set(invoice.buyerGstin, group);
    } else {
      for (const line of invoice.lines) {
        const inter = line.igstAmount > 0;
        const key = `${inter ? "INTER" : "INTRA"}|${pos}|${line.taxRate}`;
        const row = b2cs.get(key) ?? {
          sply_ty: inter ? "INTER" : "INTRA",
          pos,
          rt: line.taxRate,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
        };
        row.txval = money(row.txval + line.taxableValue);
        row.iamt = money(row.iamt + line.igstAmount);
        row.camt = money(row.camt + line.cgstAmount);
        row.samt = money(row.samt + line.sgstAmount);
        b2cs.set(key, row);
      }
    }
  }

  return {
    gstin: input.gstin,
    fp: filingPeriod(input.month),
    gt: 0,
    cur_gt: 0,
    b2b: [...b2b.values()],
    b2cs: [...b2cs.values()],
  };
}
