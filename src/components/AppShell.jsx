import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListOrdered,
  PiggyBank,
  BarChart3,
  Tags,
  Repeat,
  Settings,
  Plus,
  MoreHorizontal,
  Wallet,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { SiteFooter } from "@/components/Bits";
import { useTheme } from "@/hooks/useTheme";

const NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/recurring", label: "Recurring", icon: Repeat },
  { to: "/settings", label: "Settings", icon: Settings },
];
const MOBILE_MAIN = [NAV[0], NAV[1]];
const MOBILE_RIGHT = [NAV[2]];

export function AppShell({ children }) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">MoneyTrail</p>
            <p className="text-xs text-muted-foreground">Personal finance</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2">
          <AddTransactionDialog
            trigger={
              <Button className="w-full" size="lg">
                <Plus className="size-4" /> Add Transaction
              </Button>
            }
          />
          <Button variant="ghost" className="w-full justify-start" onClick={toggle}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </span>
            <span className="text-base font-bold">MoneyTrail</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
          <SiteFooter className="lg:mb-0" />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-end">
          {MOBILE_MAIN.map((item) => (
            <BottomLink key={item.to} {...item} active={pathname === item.to} />
          ))}
          <div className="flex justify-center">
            <AddTransactionDialog
              trigger={
                <button
                  aria-label="Add transaction"
                  className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform active:scale-95"
                >
                  <Plus className="size-7" />
                </button>
              }
            />
          </div>
          {MOBILE_RIGHT.map((item) => (
            <BottomLink key={item.to} {...item} active={pathname === item.to} />
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                <MoreHorizontal className="size-5" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetTitle className="px-1 pb-2">More</SheetTitle>
              <div className="grid grid-cols-2 gap-2 pb-6">
                {NAV.slice(3).map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm font-medium"
                  >
                    <item.icon className="size-4.5 text-primary" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

function BottomLink({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 text-xs",
        active ? "text-primary font-semibold" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
