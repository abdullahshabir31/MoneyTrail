import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { PageHeader } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddCategory,
  useAddItem,
  useCategories,
  useDeleteRow,
  useItems,
  useTransactions,
  useUpdateRow,
} from "@/hooks/useFinance";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function CategoriesPage() {
  useDocumentTitle("Categories & Items — MoneyTrail");

  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const { data: transactions = [] } = useTransactions();
  const addCategory = useAddCategory();
  const addItem = useAddItem();
  const updateCategory = useUpdateRow("categories", ["categories"]);
  const updateItem = useUpdateRow("items", ["items"]);
  const deleteCategory = useDeleteRow("categories", ["categories", "items"]);
  const deleteItem = useDeleteRow("items", ["items"]);
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState("expense");
  const [itemDraft, setItemDraft] = useState({});
  const [filter, setFilter] = useState("expense");
  const usedCategories = useMemo(
    () => new Set(transactions.map((t) => t.category_id)),
    [transactions],
  );
  const usedItems = useMemo(() => new Set(transactions.map((t) => t.item_id)), [transactions]);

  const create = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      await addCategory.mutateAsync({ name, type: newType });
      setNewCategory("");
      toast.success("Category added");
    } catch {
      toast.error("That category already exists");
    }
  };

  const createItem = async (categoryId) => {
    const name = (itemDraft[categoryId] ?? "").trim();
    if (!name) return;
    try {
      await addItem.mutateAsync({ name, category_id: categoryId });
      setItemDraft({ ...itemDraft, [categoryId]: "" });
      toast.success(`"${name}" added`);
    } catch {
      toast.error("That item already exists");
    }
  };

  const rename = (kind, id, current) => {
    const next = window.prompt(`Rename ${kind}`, current)?.trim();
    if (!next || next === current) return;
    const mut = kind === "category" ? updateCategory : updateItem;
    mut.mutate({ id, values: { name: next } }, { onSuccess: () => toast.success("Renamed") });
  };

  const removeCategory = (id, active) => {
    if (usedCategories.has(id)) {
      updateCategory.mutate(
        { id, values: { is_active: !active } },
        {
          onSuccess: () =>
            toast.info(
              active
                ? "This category is used by transactions, so it was hidden instead of deleted."
                : "Category re-activated.",
            ),
        },
      );
      return;
    }
    deleteCategory.mutate(id, { onSuccess: () => toast.success("Category deleted") });
  };

  const removeItem = (id, active) => {
    if (usedItems.has(id)) {
      updateItem.mutate(
        { id, values: { is_active: !active } },
        {
          onSuccess: () =>
            toast.info(
              active ? "Item is in use — hidden instead of deleted." : "Item re-activated.",
            ),
        },
      );
      return;
    }
    deleteItem.mutate(id, { onSuccess: () => toast.success("Item deleted") });
  };

  const visible = categories.filter((c) => c.type === filter);

  return (
    <div className="space-y-5">
      <PageHeader title="Categories" subtitle="Your categories and the items you reuse every day" />

      <div className="surface space-y-3 p-4">
        <h2 className="text-sm font-semibold">Add a category</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            placeholder="Category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="h-11"
          />
          <Select value={newType} onValueChange={(v) => setNewType(v)}>
            <SelectTrigger className="h-11 sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-11" onClick={create}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 sm:max-w-xs">
        {["expense", "income"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={
              filter === t
                ? "rounded-lg bg-card py-2 text-sm font-semibold capitalize shadow-sm"
                : "rounded-lg py-2 text-sm font-medium capitalize text-muted-foreground"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((c) => {
          const catItems = items.filter((i) => i.category_id === c.id);
          return (
            <div key={c.id} className={c.is_active ? "surface p-4" : "surface p-4 opacity-60"}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.is_default ? "Default" : "Custom"} · {catItems.length} items
                    {c.is_active ? "" : " · hidden"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => rename("category", c.id, c.name)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeCategory(c.id, c.is_active)}
                  >
                    {usedCategories.has(c.id) ? (
                      c.is_active ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {catItems.map((i) => (
                  <span
                    key={i.id}
                    className={
                      i.is_active
                        ? "group flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm"
                        : "group flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
                    }
                  >
                    {i.name}
                    <button
                      onClick={() => rename("item", i.id, i.name)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Rename ${i.name}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={() => removeItem(i.id, i.is_active)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${i.name}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Add new item"
                  value={itemDraft[c.id] ?? ""}
                  onChange={(e) => setItemDraft({ ...itemDraft, [c.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && createItem(c.id)}
                  className="h-10"
                />
                <Button variant="outline" className="h-10" onClick={() => createItem(c.id)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
