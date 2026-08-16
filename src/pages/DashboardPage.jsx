import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  ListOrdered,
  PiggyBank,
  BarChart3,
} from "lucide-react";
import { StatCard, EmptyState, PageHeader } from "@/components/Bits";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
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

export default function DashboardPage() {
  useDocumentTitle("Dashboard — MoneyTrail");

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "PKR";
  const month = currentMonth();
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "";

  const stats = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income");
    const expense = transactions.filter((t) => t.type === "expense");
    const sum = (arr) => arr.reduce((a, t) => a + t.amount, 0);
    const monthIncome = sum(income.filter((t) => inMonth(t.date, month)));
    const monthExpense = sum(expense.filter((t) => inMonth(t.date, month)));
    return {
      totalIncome: sum(income),
      totalExpense: sum(expense),
      balance: sum(income) - sum(expense),
      monthIncome,
      monthExpense,
      monthRemaining: monthIncome - monthExpense,
      count: transactions.length,
    };
  }, [transactions, month]);

  const monthly = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
    return months.map((m) => ({
      name: monthLabel(m).split(" ")[0]?.slice(0, 3) ?? "",
      Income: transactions
        .filter((t) => t.type === "income" && inMonth(t.date, m))
        .reduce((a, t) => a + t.amount, 0),
      Expense: transactions
        .filter((t) => t.type === "expense" && inMonth(t.date, m))
        .reduce((a, t) => a + t.amount, 0),
    }));
  }, [transactions, month]);

  const byCategory = useMemo(() => {
    const map = new Map();
    transactions
      .filter((t) => t.type === "expense" && inMonth(t.date, month))
      .forEach((t) => {
        const name = categories.find((c) => c.id === t.category_id)?.name ?? "Uncategorised";
        map.set(name, (map.get(name) ?? 0) + t.amount);
      });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, month]);

  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      // Local date parts, not `toISOString()` (UTC) — see todayISO() in
      // lib/finance.js. Using UTC here made "today" (and nearby days) miss
      // their transactions for hours after local midnight in Pakistan.
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    });
    return days.map((d) => ({
      name: d.slice(8),
      Spent: transactions
        .filter((t) => t.type === "expense" && t.date === d)
        .reduce((a, t) => a + t.amount, 0),
    }));
  }, [transactions]);

  const recent = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Hi ${firstName}` : "Hi there"}
        subtitle={`Here's your money for ${monthLabel(month)}`}
        action={
          <div className="hidden gap-2 lg:flex">
            <AddTransactionDialog
              defaultType="expense"
              trigger={
                <Button size="lg">
                  <Plus className="size-4" /> Add Expense
                </Button>
              }
            />
            <AddTransactionDialog
              defaultType="income"
              trigger={
                <Button size="lg" variant="outline">
                  <Plus className="size-4" /> Add Income
                </Button>
              }
            />
          </div>
        }
      />

      <div className="surface bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-80">Total balance</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">
          {formatMoney(stats.balance, currency)}
        </p>
        <div className="mt-4 flex gap-6 text-sm">
          <span className="flex items-center gap-1.5 opacity-90">
            <ArrowUpRight className="size-4" /> {formatMoney(stats.totalIncome, currency)}
          </span>
          <span className="flex items-center gap-1.5 opacity-90">
            <ArrowDownRight className="size-4" /> {formatMoney(stats.totalExpense, currency)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="This month income"
          value={formatMoney(stats.monthIncome, currency)}
          tone="income"
        />
        <StatCard
          label="This month expenses"
          value={formatMoney(stats.monthExpense, currency)}
          tone="expense"
        />
        <StatCard
          label="Remaining this month"
          value={formatMoney(stats.monthRemaining, currency)}
          tone="savings"
        />
        <StatCard label="Transactions" value={String(stats.count)} hint="All time" />
      </div>

      <div className="grid grid-cols-3 gap-2 lg:hidden">
        <QuickAction to="/transactions" icon={ListOrdered} label="Transactions" />
        <QuickAction to="/budgets" icon={PiggyBank} label="Budgets" />
        <QuickAction to="/analytics" icon={BarChart3} label="Analytics" />
      </div>

      {isLoading ? null : transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet."
          description="Start tracking your money by adding your first expense or income."
          action={
            <AddTransactionDialog
              trigger={
                <Button size="lg">
                  <Plus className="size-4" /> Add Transaction
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Income vs Expense" subtitle="Last 6 months">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ left: -20 }}>
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Income" fill="var(--color-income)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Expense breakdown" subtitle={monthLabel(month)}>
              {byCategory.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No expenses this month yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
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
              )}
            </ChartCard>
          </div>

          <ChartCard title="Spending trend" subtitle="Last 14 days">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} />
                <Tooltip
                  formatter={(v) => formatMoney(v, currency)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: "var(--color-border)" }}
                />
                <Line
                  type="monotone"
                  dataKey="Spent"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent transactions</h2>
              <Link to="/transactions" className="text-sm font-medium text-primary">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {items.find((i) => i.id === t.item_id)?.name ??
                        categories.find((c) => c.id === t.category_id)?.name ??
                        "Transaction"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(t.date)} · {categories.find((c) => c.id === t.category_id)?.name}{" "}
                      · {t.payment_method}
                    </p>
                  </div>
                  <span
                    className={
                      t.type === "income"
                        ? "shrink-0 text-sm font-semibold text-income"
                        : "shrink-0 text-sm font-semibold text-expense"
                    }
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatMoney(t.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};

// recharts only themes the tooltip's outer box via `contentStyle` — the
// label and per-series item text carry their own inline (black-by-default)
// color via `labelStyle` / `itemStyle`, so in dark mode the box went dark
// while the text inside stayed dark-on-dark. Same fix as AnalyticsPage.
export const tooltipLabelStyle = {
  color: "var(--color-popover-foreground)",
};
export const tooltipItemStyle = {
  color: "var(--color-popover-foreground)",
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="surface p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="surface flex flex-col items-center gap-2 p-4 text-xs font-medium">
      <Icon className="size-5 text-primary" />
      {label}
    </Link>
  );
}
