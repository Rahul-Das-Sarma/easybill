import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { InvoicePdfPayload } from "@/lib/invoice-pdf/types";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: { width: 120, height: 40, objectFit: "contain", marginBottom: 6 },
  h1: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  muted: { fontSize: 8, color: "#444" },
  meta: { textAlign: "right", fontSize: 8 },
  metaStrong: { fontWeight: "bold", marginBottom: 4 },
  box: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  h2: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#444",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  table: { marginTop: 8 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 6,
  },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 4,
    backgroundColor: "#fafafa",
  },
  colDesc: { width: "32%" },
  colNum: { width: "13.6%", textAlign: "right" },
  thText: { fontSize: 7, color: "#666", fontWeight: "bold" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 2, borderTopColor: "#111", marginTop: 4, paddingTop: 6 },
  notes: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 6,
    fontSize: 7,
    color: "#888",
  },
});

function fmtInr(n: string) {
  const x = Number.parseFloat(n);
  if (Number.isNaN(x)) return n;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(x);
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfPayload }) {
  const { business, customer, invoice, items, plan } = data;
  const logoOk = Boolean(
    business.logoUrl?.startsWith("http"),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {plan === "free" && logoOk ? (
              <Image src={business.logoUrl!} style={styles.logo} />
            ) : null}
            <Text style={styles.h1}>{business.companyName}</Text>
            <Text style={styles.muted}>{business.address}</Text>
            <Text style={styles.muted}>
              GSTIN: {business.gstNumber ?? "—"}
            </Text>
            <Text style={styles.muted}>
              {[business.phone, business.email].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaStrong}>Tax invoice</Text>
            <Text>{invoice.invoiceNumber}</Text>
            <Text>Issue: {invoice.issueDate}</Text>
            <Text>Due: {invoice.dueDate}</Text>
            <Text>Status: {invoice.status}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.h2}>Bill to</Text>
          <Text style={{ fontWeight: "bold" }}>{customer.name}</Text>
          {customer.address ? (
            <Text style={styles.muted}>{customer.address}</Text>
          ) : null}
          <Text style={styles.muted}>
            GSTIN: {customer.gstNumber ?? "—"}
          </Text>
          {customer.phone ? (
            <Text style={styles.muted}>{customer.phone}</Text>
          ) : null}
          {customer.email ? (
            <Text style={styles.muted}>{customer.email}</Text>
          ) : null}
        </View>

        <Text style={styles.h2}>Line items</Text>
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.colDesc, styles.thText]}>Description</Text>
            <Text style={[styles.colNum, styles.thText]}>Qty</Text>
            <Text style={[styles.colNum, styles.thText]}>Rate</Text>
            <Text style={[styles.colNum, styles.thText]}>GST%</Text>
            <Text style={[styles.colNum, styles.thText]}>GST</Text>
            <Text style={[styles.colNum, styles.thText]}>Total</Text>
          </View>
          {items.map((it) => (
            <View key={it.sortOrder} style={styles.row} wrap={false}>
              <Text style={styles.colDesc}>{it.productName}</Text>
              <Text style={styles.colNum}>{it.quantity}</Text>
              <Text style={styles.colNum}>{fmtInr(it.unitPrice)}</Text>
              <Text style={styles.colNum}>{it.taxRate}%</Text>
              <Text style={styles.colNum}>{fmtInr(it.taxAmount)}</Text>
              <Text style={styles.colNum}>{fmtInr(it.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmtInr(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Discount</Text>
            <Text>− {fmtInr(invoice.discountAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total GST</Text>
            <Text>{fmtInr(invoice.taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text style={{ fontWeight: "bold" }}>Total</Text>
            <Text style={{ fontWeight: "bold" }}>{fmtInr(invoice.totalAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Paid</Text>
            <Text>{fmtInr(invoice.amountPaid)}</Text>
          </View>
        </View>

        {invoice.customerNotes ? (
          <View style={styles.notes}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
              Terms & notes
            </Text>
            <Text>{invoice.customerNotes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          {plan === "free" ? (
            <Text>Powered by EasyBill</Text>
          ) : logoOk ? (
            <Image
              src={business.logoUrl!}
              style={{ width: 100, height: 32, objectFit: "contain", alignSelf: "center" }}
            />
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
