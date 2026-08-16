import { cn } from "@/lib/utils";
export function StatCard({ label, value, hint, tone = "default", icon }) {
  const toneClass = {
    default: "bg-card",
    income: "bg-income-soft",
    expense: "bg-expense-soft",
    savings: "bg-savings-soft",
    warning: "bg-warning-soft",
  }[tone];
  return (
    <div className={cn("surface p-4", toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
export function EmptyState({ title, description, action }) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SiteFooter({ className }) {
  return (
    <footer className={cn("mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground", className)}>
      <div className="mb-2 flex items-center justify-center gap-4">
        <a href="/auth" className="hover:text-foreground hover:underline">
          Login
        </a>
        <a href="/dashboard" className="hover:text-foreground hover:underline">
          Dashboard
        </a>
      </div>
      <p>© 2026 Abdullah. All rights reserved.</p>
    </footer>
  );
}
