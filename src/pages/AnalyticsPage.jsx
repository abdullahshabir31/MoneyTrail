import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import {
  CHART_COLORS,
  currentMonth,
  formatDate,
  formatMoney,
  inMonth,
  monthLabel,
  shiftMonth,
} from "@/lib/finance";
import { useCategories, useItems, useProfile, useTransactions } from "@/hooks/useFinance";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};

// recharts' <Tooltip> only themes its outer box via `contentStyle` — the
// label and the per-series item text each carry their own inline color
// (black by default) via `labelStyle` / `itemStyle`, which is why in dark
// mode the box turned dark but the text inside stayed dark-on-dark.
const tooltipLabelStyle = {
  color: "var(--color-popover-foreground)",
};
const tooltipItemStyle = {
  color: "var(--color-popover-foreground)",
};

export default function AnalyticsPage() {
  useDocumentTitle("Insights & Analytics — MoneyTrail");

  const [month, setMonth] = useState(currentMonth());
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "PKR";
  const monthTxns = transactions.filter((t) => inMonth(t.date, month));
  const monthExpenses = monthTxns.filter((t) => t.type === "expense");
  const prevMonth = shiftMonth(month, -1);
  const sum = (arr) => arr.reduce((a, t) => a + t.amount, 0);
  const income = sum(monthTxns.filter((t) => t.type === "income"));
  const expenses = sum(monthExpenses);
  const prevExpenses = sum(
    transactions.filter((t) => t.type === "expense" && inMonth(t.date, prevMonth)),
  );

  const byCategory = useMemo(() => {
    const map = new Map();
    monthExpenses.forEach((t) => {
      const name = categories.find((c) => c.id === t.category_id)?.name ?? "Uncategorised";
      map.set(name, (map.get(name) ?? 0) + t.amount);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, categories]);

  const topItem = useMemo(() => {
    const map = new Map();
    monthExpenses.forEach((t) => {
      const name = items.find((i) => i.id === t.item_id)?.name;
      if (!name) return;
      const cur = map.get(name) ?? { count: 0, total: 0 };
      map.set(name, { count: cur.count + 1, total: cur.total + t.amount });
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  }, [monthExpenses, items]);

  const biggest = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
  const daysElapsed =
    new Date().toISOString().slice(0, 7) === month.slice(0, 7)
      ? new Date().getDate()
      : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const avgDaily = expenses / Math.max(1, daysElapsed);
  const monthsSpan = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Math.max(1, set.size);
  }, [transactions]);
  const avgMonthly = sum(transactions.filter((t) => t.type === "expense")) / monthsSpan;
  const comparison = [
    { name: monthLabel(prevMonth).split(" ")[0], Expense: prevExpenses },
    { name: monthLabel(month).split(" ")[0], Expense: expenses },
  ];
  const topShare =
    byCategory[0] && expenses > 0 ? Math.round((byCategory[0].value / expenses) * 100) : 0;
  const change =
    prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Insights" subtitle="Where is your money actually going?" />

      <div className="surface flex items-center justify-between p-3">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-semibold">{monthLabel(month)}</span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {monthTxns.length === 0 ? (
        <EmptyState
          title="Nothing to analyse yet."
          description="Add a few transactions this month and your spending insights will appear here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Income" value={formatMoney(income, currency)} tone="income" />
            <StatCard label="Expenses" value={formatMoney(expenses, currency)} tone="expense" />
            <StatCard
              label="Net savings"
              value={formatMoney(income - expenses, currency)}
              tone="savings"
            />
            <StatCard label="Transactions" value={String(monthTxns.length)} />
            <StatCard label="Avg / day" value={formatMoney(Math.round(avgDaily), currency)} />
            <StatCard label="Avg / month" value={formatMoney(Math.round(avgMonthly), currency)} />
            <StatCard
              label="Biggest expense"
              value={biggest ? formatMoney(biggest.amount, currency) : "—"}
              hint={biggest ? formatDate(biggest.date) : undefined}
            />
            <StatCard
              label="Most used category"
              value={byCategory[0]?.name ?? "—"}
              hint={byCategory[0] ? formatMoney(byCategory[0].value, currency) : undefined}
            />
          </div>

          <div className="surface space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-warning" /> Insights
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {byCategory[0] ? (
                <li>
                  You spent <strong className="text-foreground">{topShare}%</strong> of this month's
                  expenses on <strong className="text-foreground">{byCategory[0].name}</strong>.
                </li>
              ) : null}
              {topItem ? (
                <li>
                  Your most frequent purchase is{" "}
                  <strong className="text-foreground">{topItem[0]}</strong> ({topItem[1].count}{" "}
                  times, {formatMoney(topItem[1].total, currency)}).
                </li>
              ) : null}
              {prevExpenses > 0 ? (
                <li>
                  You spent{" "}
                  <strong className="text-foreground">
                    {Math.abs(change)}% {change >= 0 ? "more" : "less"}
                  </strong>{" "}
                  than {monthLabel(prevMonth)}.
                </li>
              ) : null}
              <li>
                {income >= expenses
                  ? `You are saving ${formatMoney(income - expenses, currency)} this month. Nice.`
                  : `You are spending ${formatMoney(expenses - income, currency)} more than you earned this month.`}
              </li>
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-4">
              <h2 className="mb-3 text-base font-semibold">Spending breakdown</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(v, currency)}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="surface p-4">
              <h2 className="mb-3 text-base font-semibold">Month-to-month</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparison} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} />
                  <Tooltip
                    formatter={(v) => formatMoney(v, currency)}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ fill: "var(--color-muted)" }}
                  />
                  <Bar dataKey="Expense" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface p-4">
            <h2 className="mb-3 text-base font-semibold">Category totals</h2>
            <ul className="divide-y divide-border">
              {byCategory.map((c) => (
                <li key={c.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{c.name}</span>
                  <span className="font-semibold">{formatMoney(c.value, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
