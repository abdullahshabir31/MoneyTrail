import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS, todayISO } from "@/lib/finance";
import { useAddItem, useCategories, useItems, useSaveTransaction } from "@/hooks/useFinance";
export function AddTransactionDialog({
  trigger,
  defaultType = "expense",
  transaction,
  open: controlledOpen,
  onOpenChange,
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const save = useSaveTransaction();
  const addItem = useAddItem();
  const [type, setType] = useState(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [itemId, setItemId] = useState(transaction?.item_id ?? "");
  const [method, setMethod] = useState(transaction?.payment_method ?? "Cash");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [newItem, setNewItem] = useState(null);
  useEffect(() => {
    if (!open) return;
    setType(transaction?.type ?? defaultType);
    setAmount(transaction ? String(transaction.amount) : "");
    setDate(transaction?.date ?? todayISO());
    setCategoryId(transaction?.category_id ?? "");
    setItemId(transaction?.item_id ?? "");
    setMethod(transaction?.payment_method ?? "Cash");
    setDescription(transaction?.description ?? "");
    setNote(transaction?.note ?? "");
    setNewItem(null);
  }, [open, defaultType, transaction]);
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === type && c.is_active),
    [categories, type],
  );
  const categoryItems = useMemo(
    () => items.filter((i) => i.category_id === categoryId && i.is_active),
    [items, categoryId],
  );
  const recent = useMemo(
    () =>
      [...categoryItems]
        .filter((i) => i.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 4),
    [categoryItems],
  );
  const handleAddItem = async () => {
    const name = (newItem ?? "").trim();
    if (!name || !categoryId) return;
    try {
      const created = await addItem.mutateAsync({ name, category_id: categoryId });
      setItemId(created.id);
      setNewItem(null);
      toast.success(`"${name}" added`);
    } catch {
      toast.error("Could not add that item — it may already exist.");
    }
  };
  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }
    try {
      await save.mutateAsync({
        ...(transaction ? { id: transaction.id } : {}),
        type,
        amount: value,
        date,
        category_id: categoryId,
        item_id: itemId || null,
        payment_method: method,
        description: description || null,
        note: note || null,
      });
      toast.success(transaction ? "Transaction updated" : "Transaction saved");
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {["expense", "income"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId("");
                setItemId("");
              }}
              className={cn(
                "rounded-lg py-2.5 text-sm font-semibold capitalize transition-colors",
                type === t
                  ? t === "expense"
                    ? "bg-expense text-expense-foreground"
                    : "bg-income text-income-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="decimal"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 text-2xl font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
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

        <div className="grid gap-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id);
                  setItemId("");
                }}
                className={cn(
                  "rounded-full border border-border px-3.5 py-2 text-sm font-medium transition-colors",
                  categoryId === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {categoryId ? (
          <div className="grid gap-2">
            <Label>Item</Label>
            {recent.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Recent</span>
                {recent.map((i) => (
                  <ItemChip
                    key={i.id}
                    label={i.name}
                    active={itemId === i.id}
                    onClick={() => setItemId(i.id)}
                  />
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {categoryItems.map((i) => (
                <ItemChip
                  key={i.id}
                  label={i.name}
                  active={itemId === i.id}
                  onClick={() => setItemId(itemId === i.id ? "" : i.id)}
                />
              ))}
              <button
                type="button"
                onClick={() => setNewItem("")}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                <Plus className="size-3.5" /> Add New
              </button>
            </div>
            {newItem !== null ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Enter item name"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  className="h-11"
                />
                <Button type="button" onClick={handleAddItem} className="h-11">
                  <Check className="size-4" /> Save
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="desc">Description (optional)</Label>
          <Input
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11"
            placeholder="e.g. Dinner with friends"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything worth remembering"
          />
        </div>

        <Button
          size="lg"
          className="h-12 w-full text-base"
          onClick={submit}
          disabled={save.isPending}
        >
          {transaction ? "Update" : "Save"} {type === "expense" ? "expense" : "income"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
function ItemChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}
