import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftRight, ChevronRight, Pencil, Trash2, Wallet2 } from "lucide-react";
import { PageHeader, EmptyState, StatCard } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, todayISO } from "@/lib/finance";
import {
  useAccountBalances,
  useAccountTransfers,
  useAddTransfer,
  useDeleteTransfer,
  useProfile,
  useSetOpeningBalance,
} from "@/hooks/useFinance";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDismissKeyboardOnScroll } from "@/hooks/useDismissKeyboardOnScroll";

export default function AccountsPage() {
  useDocumentTitle("Accounts — MoneyTrail");

  const { accounts: allAccounts, totalBalance, isLoading } = useAccountBalances();
  // "Used" = balance isn't sitting at exactly zero — no opening balance and no
  // income/expense/transfer has touched it yet. Unused accounts (e.g. default
  // payment methods nobody has picked) stay hidden until they actually hold
  // money, so the list only shows accounts that matter.
  const accounts = useMemo(() => allAccounts.filter((a) => a.balance !== 0), [allAccounts]);
  const { data: transfers = [] } = useAccountTransfers();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "PKR";
  const [editingId, setEditingId] = useState(null);
  const deleteTransfer = useDeleteTransfer();

  const removeTransfer = async (id) => {
    try {
      await deleteTransfer.mutateAsync(id);
      toast.success("Transfer deleted");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts"
        subtitle="How much money sits in each account, updated automatically as you add income and expenses"
        action={<TransferDialog usedAccounts={accounts} currency={currency} />}
      />

      <StatCard
        label="Total balance"
        value={isLoading ? "—" : formatMoney(totalBalance, currency)}
        hint={isLoading ? "Loading…" : `Across ${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
        tone="savings"
        icon={<Wallet2 className="size-4 text-muted-foreground" />}
      />

      {isLoading ? null : accounts.length === 0 ? (
        <EmptyState
          title={allAccounts.length === 0 ? "No accounts yet" : "No accounts used yet"}
          description={
            allAccounts.length === 0
              ? "Payment methods you use on income or expenses (Cash, Bank, Easypaisa...) show up here automatically."
              : "Add an income or expense (or a transfer) using a payment method, and it'll show up here with its balance."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              currency={currency}
              editing={editingId === a.id}
              onEdit={() => setEditingId(a.id)}
              onDoneEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Recent transfers</h2>
        {transfers.length === 0 ? (
          <p className="surface px-4 py-6 text-center text-sm text-muted-foreground">
            No transfers yet. Use "Transfer" above to move money between accounts, e.g. JazzCash to
            Easypaisa.
          </p>
        ) : (
          <div className="surface divide-y divide-border">
            {transfers.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{t.from_method}</span>
                  <ArrowLeftRight className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{t.to_method}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatMoney(t.amount, currency)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete transfer"
                    onClick={() => removeTransfer(t.id)}
                    disabled={deleteTransfer.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountCard({ account, currency, editing, onEdit, onDoneEdit }) {
  const setOpening = useSetOpeningBalance();
  const [value, setValue] = useState(String(account.opening_balance));

  const save = async () => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      toast.error("Enter a valid amount");
      return;
    }
    await setOpening.mutateAsync({ id: account.id, opening_balance: num });
    toast.success("Opening balance updated");
    onDoneEdit();
  };

  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/transactions?method=${encodeURIComponent(account.name)}`}
          className="min-w-0 flex-1 rounded-lg -m-1 p-1 transition-colors hover:bg-accent"
        >
          <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            {account.name}
            <ChevronRight className="size-3.5 opacity-50" />
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tracking-tight",
              account.balance < 0 && "text-expense",
            )}
          >
            {formatMoney(account.balance, currency)}
          </p>
        </Link>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground"
          aria-label="Edit opening balance"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setValue(String(account.opening_balance));
            editing ? onDoneEdit() : onEdit();
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>

      {editing ? (
        <div className="mt-3 flex gap-2">
          <Input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="h-9"
            placeholder="Opening balance"
          />
          <Button type="button" size="sm" onClick={save} disabled={setOpening.isPending}>
            Save
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Opening balance {formatMoney(account.opening_balance, currency)} · +
          {formatMoney(account.income, currency)} in · -{formatMoney(account.expense, currency)} out
        </p>
      )}
    </div>
  );
}

function TransferDialog({ usedAccounts, currency }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const addTransfer = useAddTransfer();
  const dismissKeyboardOnScroll = useDismissKeyboardOnScroll();

  const fromAccount = useMemo(
    () => usedAccounts.find((a) => a.name === from),
    [usedAccounts, from],
  );
  // Same "only accounts that actually hold money" rule as the "From" list
  // above — a destination with a zero balance just clutters the picker.
  const toAccounts = useMemo(
    () => usedAccounts.filter((a) => a.name !== from),
    [usedAccounts, from],
  );

  const reset = () => {
    setFrom("");
    setTo("");
    setAmount("");
    setDate(todayISO());
    setNote("");
  };

  const submit = async () => {
    const value = Number(amount);
    if (!from || !to) {
      toast.error("Pick both accounts");
      return;
    }
    if (from === to) {
      toast.error("Pick two different accounts");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await addTransfer.mutateAsync({
        from_method: from,
        to_method: to,
        amount: value,
        date,
        note,
      });
      toast.success(`Transferred ${formatMoney(value, currency)} from ${from} to ${to}`);
      setOpen(false);
      reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="size-4" /> Transfer
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] gap-4 overflow-y-auto overscroll-contain rounded-2xl touch-pan-y sm:max-w-md"
        onScroll={dismissKeyboardOnScroll}
      >
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label>From</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Source account" />
            </SelectTrigger>
            <SelectContent>
              {usedAccounts.map((a) => (
                <SelectItem key={a.id} value={a.name}>
                  {a.name} · {formatMoney(a.balance, currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {usedAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No account has any balance yet — add an income first.
            </p>
          ) : null}
          {fromAccount && Number(amount) > fromAccount.balance ? (
            <p className="text-xs text-warning">
              This is more than the current balance in {from} (
              {formatMoney(fromAccount.balance, currency)}).
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label>To</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Destination account" />
            </SelectTrigger>
            <SelectContent>
              {toAccounts.map((a) => (
                <SelectItem key={a.id} value={a.name}>
                  {a.name} · {formatMoney(a.balance, currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {toAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No other account has a balance yet — add an income first.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="transfer-amount">Amount</Label>
            <Input
              id="transfer-amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transfer-date">Date</Label>
            <Input
              id="transfer-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Input
            id="transfer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Moved for online payment"
            className="h-11"
          />
        </div>

        <Button
          size="lg"
          className="h-12 w-full text-base"
          onClick={submit}
          disabled={addTransfer.isPending}
        >
          Transfer
        </Button>
      </DialogContent>
    </Dialog>
  );
}
