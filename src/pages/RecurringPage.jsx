import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Repeat, Check } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FREQUENCIES,
  PAYMENT_METHODS,
  formatDate,
  formatMoney,
  nextOccurrence,
  todayISO,
} from "@/lib/finance";
import {
  useCategories,
  useDeleteRow,
  useInsertRow,
  useItems,
  useProfile,
  useRecurringTransactions,
  useSaveTransaction,
  useUpdateRow,
} from "@/hooks/useFinance";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function RecurringPage() {
  useDocumentTitle("Recurring — MoneyTrail");

  const { data: recurring = [] } = useRecurringTransactions();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const { data: profile } = useProfile();
  const insert = useInsertRow("recurring_transactions", ["recurring_transactions"]);
  const update = useUpdateRow("recurring_transactions", ["recurring_transactions"]);
  const del = useDeleteRow("recurring_transactions", ["recurring_transactions"]);
  const saveTxn = useSaveTransaction();
  const currency = profile?.currency ?? "PKR";
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDate, setNextDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");

  const add = async () => {
    const value = Number(amount);
    if (!value || !categoryId) {
      toast.error("Amount and category are required");
      return;
    }
    await insert.mutateAsync({
      type,
      amount: value,
      category_id: categoryId,
      item_id: itemId || null,
      frequency,
      next_date: nextDate,
      payment_method: method,
    });
    setAmount("");
    setItemId("");
    toast.success("Recurring transaction added");
  };

  const logNow = async (r) => {
    await saveTxn.mutateAsync({
      type: r.type,
      amount: r.amount,
      date: r.next_date,
      category_id: r.category_id,
      item_id: r.item_id,
      payment_method: r.payment_method,
      description: "Recurring",
    });
    await update.mutateAsync({
      id: r.id,
      values: { next_date: nextOccurrence(r.next_date, r.frequency) },
    });
    toast.success("Logged and scheduled for next time");
  };

  const catItems = items.filter((i) => i.category_id === categoryId && i.is_active);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recurring"
        subtitle="Subscriptions, rent, bills and anything that repeats"
      />

      <div className="surface space-y-3 p-4">
        <h2 className="text-sm font-semibold">Add recurring transaction</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v);
                setCategoryId("");
              }}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Amount</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setItemId("");
              }}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => c.type === type && c.is_active)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId} disabled={!categoryId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Item" />
              </SelectTrigger>
              <SelectContent>
                {catItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f} className="capitalize">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Next date</Label>
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="h-11 w-full sm:w-auto" onClick={add}>
          <Plus className="size-4" /> Add recurring
        </Button>
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          title="No recurring transactions."
          description="Add things like Netflix, rent or your internet bill so you never forget them."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {recurring.map((r) => (
            <div key={r.id} className={r.is_active ? "surface p-4" : "surface p-4 opacity-60"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Repeat className="size-4 text-primary" />
                    {items.find((i) => i.id === r.item_id)?.name ??
                      categories.find((c) => c.id === r.category_id)?.name ??
                      "Recurring"}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {r.frequency} · next {formatDate(r.next_date)} · {r.payment_method}
                  </p>
                </div>
                <span
                  className={
                    r.type === "income" ? "font-bold text-income" : "font-bold text-expense"
                  }
                >
                  {formatMoney(r.amount, currency)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => logNow(r)}>
                  <Check className="size-3.5" /> Log now
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => update.mutate({ id: r.id, values: { is_active: v } })}
                  />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
