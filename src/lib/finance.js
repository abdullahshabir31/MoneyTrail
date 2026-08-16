export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];
export const CURRENCIES = [
  { code: "PKR", symbol: "Rs." },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AED", symbol: "د.إ" },
  { code: "INR", symbol: "₹" },
  { code: "SAR", symbol: "SR" },
];
export function currencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
export function formatMoney(value, currency = "PKR") {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}${currencySymbol(currency)} ${formatted}`;
}
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
export function monthStart(d) {
  const date = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
export function currentMonth() {
  return monthStart(new Date());
}
export function monthLabel(month) {
  const d = new Date(`${month.slice(0, 7)}-01T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
export function shiftMonth(month, delta) {
  const d = new Date(`${month.slice(0, 7)}-01T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return monthStart(d);
}
export function inMonth(date, month) {
  return date.slice(0, 7) === month.slice(0, 7);
}
export function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function nextOccurrence(date, frequency) {
  const d = new Date(`${date}T00:00:00`);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  // Build the ISO string from local date parts, not `d.toISOString()` — that
  // converts to UTC first, which rolls the date back a day for any
  // timezone ahead of UTC (e.g. Pakistan, +5h) once the local time is
  // midnight. Same class of bug as the one already fixed in todayISO().
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];
