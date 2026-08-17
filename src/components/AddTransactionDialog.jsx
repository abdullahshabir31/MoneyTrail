import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Search, X } from "lucide-react";
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
import { todayISO } from "@/lib/finance";
import {
  useAddCategory,
  useAddItem,
  useAddPaymentMethod,
  useCategories,
  useItems,
  usePaymentMethods,
  useSaveTransaction,
} from "@/hooks/useFinance";
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
  const { data: paymentMethods = [] } = usePaymentMethods();
  const save = useSaveTransaction();
  const addItem = useAddItem();
  const addCategory = useAddCategory();
  const addPaymentMethod = useAddPaymentMethod();
  const [type, setType] = useState(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [itemId, setItemId] = useState(transaction?.item_id ?? "");
  const [method, setMethod] = useState(transaction?.payment_method ?? "Cash");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [newItem, setNewItem] = useState(null);
  const [newCategory, setNewCategory] = useState(null);
  const [newMethod, setNewMethod] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
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
    setNewCategory(null);
    setNewMethod(null);
    setCategorySearch("");
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
  // Search across every category AND every item of the current type (income
  // or expense), so typing e.g. "train" finds "Train" even though it lives
  // inside "Transport" — no need to open Transport first to find it.
  const categorySearchResults = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return [];
    const visibleIds = new Set(visibleCategories.map((c) => c.id));
    const catById = new Map(visibleCategories.map((c) => [c.id, c]));
    const results = [];
    for (const it of items) {
      if (!it.is_active || !visibleIds.has(it.category_id)) continue;
      if (it.name.toLowerCase().includes(q)) {
        const cat = catById.get(it.category_id);
        results.push({
          key: `item-${it.id}`,
          categoryId: cat.id,
          itemId: it.id,
          label: it.name,
          hint: cat.name,
        });
      }
    }
    for (const c of visibleCategories) {
      if (c.name.toLowerCase().includes(q)) {
        results.push({
          key: `cat-${c.id}`,
          categoryId: c.id,
          itemId: null,
          label: c.name,
          hint: null,
        });
      }
    }
    return results.slice(0, 25);
  }, [categorySearch, items, visibleCategories]);
  const handleSearchSelect = (result) => {
    setCategoryId(result.categoryId);
    setItemId(result.itemId ?? "");
    setNewCategory(null);
    setNewItem(null);
    setCategorySearch("");
    const catName = result.hint ?? categories.find((c) => c.id === result.categoryId)?.name;
    toast.success(
      result.hint ? `${result.label} selected, in ${catName}` : `${result.label} selected`,
    );
  };
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
  const handleAddCategory = async () => {
    const name = (newCategory ?? "").trim();
    if (!name) return;
    try {
      const created = await addCategory.mutateAsync({ name, type });
      setCategoryId(created.id);
      setItemId("");
      setNewCategory(null);
      toast.success(`"${name}" added`);
    } catch {
      toast.error("Could not add that category — it may already exist.");
    }
  };
  const handleAddMethod = async () => {
    const name = (newMethod ?? "").trim();
    if (!name) return;
    try {
      const created = await addPaymentMethod.mutateAsync({ name });
      setMethod(created.name);
      setNewMethod(null);
      toast.success(`"${name}" added`);
    } catch {
      toast.error("Could not add that payment method — it may already exist.");
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
      <DialogContent className="gap-4 rounded-2xl sm:max-w-lg">
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
                setNewCategory(null);
                setNewItem(null);
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label>Payment method</Label>
            <div className="flex gap-2">
              <Select
                value={method}
                onValueChange={(v) => {
                  setMethod(v);
                  setNewMethod(null);
                }}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter((m) => m.is_active !== false)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-11 w-11 shrink-0"
                onClick={() => setNewMethod(newMethod === null ? "" : null)}
                aria-label="Add payment method"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {newMethod !== null ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="e.g. Meezan Bank"
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMethod()}
                  className="h-11"
                />
                <Button type="button" onClick={handleAddMethod} className="h-11">
                  <Check className="size-4" /> Save
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Category</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search category or item, e.g. Train"
              className="h-11 pl-9 pr-9"
            />
            {categorySearch ? (
              <button
                type="button"
                onClick={() => setCategorySearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {categorySearch.trim() ? (
            categorySearchResults.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categorySearchResults.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => handleSearchSelect(r)}
                    className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3.5 py-2 text-sm font-medium hover:bg-primary/10"
                  >
                    {r.label}
                    {r.hint ? (
                      <span className="text-xs text-muted-foreground">in {r.hint}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">
                No match for "{categorySearch}". Try another word, or add it as a new category
                below.
              </p>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setItemId("");
                    setNewCategory(null);
                    setNewItem(null);
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
              <button
                type="button"
                onClick={() => {
                  setNewCategory(newCategory === null ? "" : null);
                  setNewItem(null);
                }}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3.5 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                <Plus className="size-3.5" /> Add New
              </button>
            </div>
          )}
          {newCategory !== null ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Enter category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                className="h-11"
              />
              <Button type="button" onClick={handleAddCategory} className="h-11">
                <Check className="size-4" /> Save
              </Button>
            </div>
          ) : null}
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
                    onClick={() => {
                      setItemId(i.id);
                      setNewItem(null);
                    }}
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
                  onClick={() => {
                    setItemId(itemId === i.id ? "" : i.id);
                    setNewItem(null);
                  }}
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
