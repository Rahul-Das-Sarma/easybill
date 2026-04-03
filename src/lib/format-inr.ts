/** Shared INR display formatter for invoice UI. */
export const formatInr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
