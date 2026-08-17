import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Trash2, Search, Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Bits";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatMoney } from "@/lib/finance";
import {
  useCategories,
  useDeleteTransaction,
  useItems,
  usePaymentMethods,
  useProfile,
  useTransactions,
} from "@/hooks/useFinance";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function TransactionsPage() {
  useDocumentTitle("Transactions — MoneyTrail");

  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: profile } = useProfile();
  const del = useDeleteTransaction();
  const currency = profile?.currency ?? "PKR";
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  // Coming from the Accounts page ("view this account's transactions") lands
  // here with ?method=<name> — preselect that account's filter so the list
  // is already narrowed down to just its transactions.
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState(searchParams.get("method") ?? "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [editing, setEditing] = useState(null);

  const catName = (id) => categories.find((c) => c.id === id)?.name ?? "—";
  const itemName = (id) => items.find((i) => i.id === id)?.name ?? "—";

  // Re-sync if the URL's ?method= changes to a *new* value while already on
  // this page (e.g. clicking a different account on the Accounts page
  // without a full navigation/remount). Track the last value we applied so
  // a manual change to the filter dropdown (which doesn't touch the URL)
  // isn't fought by this effect on the next render.
  const appliedMethodParam = useRef(searchParams.get("method"));
  useEffect(() => {
    const fromUrl = searchParams.get("method");
    if (fromUrl && fromUrl !== appliedMethodParam.current) {
      setMethod(fromUrl);
      appliedMethodParam.current = fromUrl;
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = transactions.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (category !== "all" && t.category_id !== category) return false;
      if (method !== "all" && t.payment_method !== method) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (q) {
        const haystack = [
          catName(t.category_id),
          itemName(t.item_id),
          t.description ?? "",
          t.note ?? "",
          t.payment_method,
          t.date,
          String(t.amount),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return list.sort((a, b) =>
      sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, search, type, category, method, from, to, sort, categories, items]);

  const total = filtered.reduce((a, t) => a + (t.type === "expense" ? -t.amount : t.amount), 0);

  const remove = async (id) => {
    await del.mutateAsync(id);
    toast.success("Transaction deleted");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} shown · net ${formatMoney(total, currency)}`}
        action={
          <AddTransactionDialog
            trigger={
              <Button className="hidden lg:inline-flex">
                <Plus className="size-4" /> Add Transaction
              </Button>
            }
          />
        }
      />

      <div className="surface space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search e.g. Pasta, Netflix, Petrol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Filter value={type} onChange={setType} placeholder="Type">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </Filter>
          <Filter value={category} onChange={setCategory} placeholder="Category">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.type})
              </SelectItem>
            ))}
          </Filter>
          <Filter value={method} onChange={setMethod} placeholder="Payment">
            <SelectItem value="all">All methods</SelectItem>
            {paymentMethods.map((m) => (
              <SelectItem key={m.id} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </Filter>
          <Filter value={sort} onChange={setSort} placeholder="Sort">
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </Filter>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 min-w-0"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 min-w-0"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions found."
          description="Try clearing your filters, or add your first expense or income."
          action={
            <AddTransactionDialog
              trigger={
                <Button>
                  <Plus className="size-4" /> Add Transaction
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((t) => (
              <div key={t.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{itemName(t.item_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {catName(t.category_id)} · {formatDate(t.date)}
                    </p>
                  </div>
                  <span
                    className={
                      t.type === "income"
                        ? "shrink-0 font-bold text-income"
                        : "shrink-0 font-bold text-expense"
                    }
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatMoney(t.amount, currency)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">{t.payment_method}</span>
                  {t.description ? <span>{t.description}</span> : null}
                </div>
                {t.note ? <p className="mt-2 text-xs text-muted-foreground">{t.note}</p> : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditing(t)}
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-destructive"
                    onClick={() => remove(t.id)}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="surface hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          t.type === "income"
                            ? "rounded-full bg-income-soft px-2 py-0.5 text-xs font-medium text-income"
                            : "rounded-full bg-expense-soft px-2 py-0.5 text-xs font-medium text-expense"
                        }
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{catName(t.category_id)}</td>
                    <td className="px-4 py-3">{itemName(t.item_id)}</td>
                    <td className="px-4 py-3">{t.payment_method}</td>
                    <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">
                      {t.description || t.note || "—"}
                    </td>
                    <td
                      className={
                        t.type === "income"
                          ? "px-4 py-3 text-right font-semibold text-income"
                          : "px-4 py-3 text-right font-semibold text-expense"
                      }
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatMoney(t.amount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => remove(t.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing ? (
        <AddTransactionDialog
          transaction={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function Filter({ value, onChange, placeholder, children }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
