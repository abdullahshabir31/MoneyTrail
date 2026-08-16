import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download, LogOut, Moon, Sun, Trash2, Tags, Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/Bits";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { CURRENCIES, formatDate, monthLabel, currentMonth } from "@/lib/finance";
import {
  useAddPaymentMethod,
  useCategories,
  useDeleteRow,
  useItems,
  usePaymentMethods,
  useProfile,
  useTransactions,
} from "@/hooks/useFinance";
import { deleteAccount } from "@/services/accountService";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function SettingsPage() {
  useDocumentTitle("Settings — MoneyTrail");

  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { data: profile, refetch } = useProfile();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useItems();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const addPaymentMethod = useAddPaymentMethod();
  const deletePaymentMethod = useDeleteRow("payment_methods", ["payment_methods"]);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newMethod, setNewMethod] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setCurrency(profile.currency);
    }
  }, [profile]);

  const saveProfile = async (values) => {
    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", user?.id ?? "");
    if (error) {
      toast.error("Could not save");
      return;
    }
    await refetch();
    toast.success("Saved");
  };

  const exportCsv = (scope) => {
    let rows = transactions;
    if (scope === "month")
      rows = rows.filter((t) => t.date.slice(0, 7) === currentMonth().slice(0, 7));
    if (scope === "range") {
      if (!from || !to) {
        toast.error("Pick both dates");
        return;
      }
      rows = rows.filter((t) => t.date >= from && t.date <= to);
    }
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const header = [
      "Date",
      "Type",
      "Category",
      "Item",
      "Amount",
      "Payment Method",
      "Description",
      "Note",
    ];
    const csv = [
      header.join(","),
      ...rows.map((t) =>
        [
          t.date,
          t.type,
          categories.find((c) => c.id === t.category_id)?.name ?? "",
          items.find((i) => i.id === t.item_id)?.name ?? "",
          t.amount,
          t.payment_method,
          (t.description ?? "").replace(/,/g, " "),
          (t.note ?? "").replace(/,/g, " "),
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneytrail-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  };

  const printReport = () => window.print();

  const addMethod = async () => {
    const value = newMethod.trim();
    if (!value) return;
    try {
      await addPaymentMethod.mutateAsync({ name: value });
      setNewMethod("");
      toast.success(`"${value}" added`);
    } catch {
      toast.error("That payment method already exists");
    }
  };

  const removeMethod = (id) => {
    deletePaymentMethod.mutate(id, { onSuccess: () => toast.success("Payment method removed") });
  };

  const destroy = async () => {
    if (!window.confirm("Delete your account and all financial data? This cannot be undone."))
      return;
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      navigate("/auth");
    } catch {
      toast.error("Could not delete account");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle={user?.email ?? ""} />

      <Section title="Profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="h-11" />
          </div>
        </div>
        <Button onClick={() => saveProfile({ display_name: name })}>Save profile</Button>
      </Section>

      <Section title="Currency">
        <Select
          value={currency}
          onValueChange={(v) => {
            setCurrency(v);
            saveProfile({ currency: v });
          }}
        >
          <SelectTrigger className="h-11 sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section title="Theme">
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            <Sun className="size-4" /> Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            <Moon className="size-4" /> Dark
          </Button>
        </div>
      </Section>

      <Section title="Notifications">
        <ToggleRow
          label="Warn me when I'm close to a budget"
          checked={profile?.notify_budget ?? true}
          onChange={(v) => saveProfile({ notify_budget: v })}
        />
        <ToggleRow
          label="Remind me about recurring payments"
          checked={profile?.notify_recurring ?? true}
          onChange={(v) => saveProfile({ notify_recurring: v })}
        />
      </Section>

      <Section title="Categories & items">
        <p className="text-sm text-muted-foreground">
          Manage your categories and reusable items like Pasta, Petrol or Netflix.
        </p>
        <Button variant="outline" asChild>
          <Link to="/categories">
            <Tags className="size-4" /> Open categories
          </Link>
        </Button>
      </Section>

      <Section title="Payment methods">
        <p className="text-sm text-muted-foreground">
          These are only visible to you — add your own (e.g. a specific bank or wallet) alongside
          the defaults.
        </p>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((m) => (
            <span
              key={m.id}
              className="group flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"
            >
              <Wallet className="size-3.5 text-muted-foreground" />
              {m.name}
              {!m.is_default ? (
                <button
                  onClick={() => removeMethod(m.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${m.name}`}
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Meezan Bank"
            value={newMethod}
            onChange={(e) => setNewMethod(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMethod()}
            className="h-11"
          />
          <Button className="h-11" onClick={addMethod}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </Section>

      <Section title="Export data">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCsv("all")}>
            <Download className="size-4" /> All transactions (CSV)
          </Button>
          <Button variant="outline" onClick={() => exportCsv("month")}>
            <Download className="size-4" /> {monthLabel(currentMonth())} (CSV)
          </Button>
          <Button variant="outline" onClick={printReport}>
            PDF report (print)
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11"
          />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11" />
          <Button className="h-11" onClick={() => exportCsv("range")}>
            Export range
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {transactions.length} transactions stored
          {transactions[0] ? ` · latest ${formatDate(transactions[0].date)}` : ""}
        </p>
      </Section>

      <Section title="Account">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="size-4" /> Log out
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={destroy}>
            <Trash2 className="size-4" /> Delete account
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="surface space-y-3 p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
