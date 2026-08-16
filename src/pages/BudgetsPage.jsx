import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { currentMonth, formatMoney, inMonth, monthLabel, shiftMonth } from "@/lib/finance";
import {
  useBudgets,
  useCategories,
  useDeleteRow,
  useProfile,
  useTransactions,
  useUpsertBudget,
} from "@/hooks/useFinance";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function BudgetsPage() {
  useDocumentTitle("Budgets — MoneyTrail");

  const [month, setMonth] = useState(currentMonth());
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const upsert = useUpsertBudget();
  const del = useDeleteRow("budgets", ["budgets"]);
  const currency = profile?.currency ?? "PKR";
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const expenseCategories = categories.filter((c) => c.type === "expense" && c.is_active);

  const rows = useMemo(() => {
    return budgets
      .filter((b) => b.month.slice(0, 7) === month.slice(0, 7))
      .map((b) => {
        const spent = transactions
          .filter(
            (t) =>
              t.type === "expense" && t.category_id === b.category_id && inMonth(t.date, month),
          )
          .reduce((a, t) => a + t.amount, 0);
        return {
          ...b,
          name: categories.find((c) => c.id === b.category_id)?.name ?? "Category",
          spent,
          pct: Math.min(200, Math.round((spent / b.amount) * 100)),
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, transactions, categories, month]);

  const save = async () => {
    const value = Number(amount);
    if (!categoryId || !value) {
      toast.error("Pick a category and amount");
      return;
    }
    await upsert.mutateAsync({ category_id: categoryId, month, amount: value });
    setAmount("");
    setCategoryId("");
    toast.success("Budget saved");
  };

  const totalBudget = rows.reduce((a, r) => a + r.amount, 0);
  const totalSpent = rows.reduce((a, r) => a + r.spent, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Budgets" subtitle="Monthly spending limits per category" />

      <div className="surface flex items-center justify-between p-3">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-semibold">{monthLabel(month)}</span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="surface space-y-3 p-4">
        <h2 className="text-sm font-semibold">Set a budget</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            inputMode="decimal"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11"
          />
          <Button className="h-11" onClick={save}>
            Save budget
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No budgets for this month."
          description="Set a budget for categories like Food or Transport to keep your spending in check."
        />
      ) : (
        <>
          <div className="surface p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total budget</span>
              <span className="font-semibold">{formatMoney(totalBudget, currency)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-semibold text-expense">
                {formatMoney(totalSpent, currency)}
              </span>
            </div>
            <Progress
              value={Math.min(100, (totalSpent / (totalBudget || 1)) * 100)}
              className="mt-3 h-2.5"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((r) => {
              const over = r.spent > r.amount;
              const close = !over && r.pct >= 80;
              return (
                <div key={r.id} className="surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{r.name}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          over
                            ? "rounded-full bg-expense-soft px-2 py-0.5 text-xs font-medium text-expense"
                            : close
                              ? "rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"
                              : "rounded-full bg-income-soft px-2 py-0.5 text-xs font-medium text-income"
                        }
                      >
                        {r.pct}% used
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => del.mutate(r.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={Math.min(100, r.pct)} className="mt-3 h-2.5" />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Spent {formatMoney(r.spent, currency)}</span>
                    <span>
                      {over ? "Over by " : "Left "}
                      {formatMoney(Math.abs(r.amount - r.spent), currency)} of{" "}
                      {formatMoney(r.amount, currency)}
                    </span>
                  </div>
                  {over ? (
                    <p className="mt-2 text-xs font-medium text-expense">
                      You have exceeded this budget.
                    </p>
                  ) : close ? (
                    <p className="mt-2 text-xs font-medium text-warning">
                      You are close to your limit.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
