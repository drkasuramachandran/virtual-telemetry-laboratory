import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Radio, Menu, Lock } from "lucide-react";
import { Sheet, SheetContent as SheetContentBase, SheetTrigger as SheetTriggerBase } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAV } from "@/lib/nav";

const SheetContent = SheetContentBase as any;
const SheetTrigger = SheetTriggerBase as any;

const NavList: React.FC<{ pathname: string; onNavigate?: () => void }> = ({
  pathname,
  onNavigate,
}) => (
  <nav className="space-y-5" data-testid="sidebar-nav">
    {NAV.map((section) => (
      <div key={section.title}>
        <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {section.title}
        </p>
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            const base =
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors";
            if (!item.enabled) {
              return (
                <div
                  key={item.to}
                  className={`${base} cursor-not-allowed text-muted-foreground/50`}
                  title="Available in a later phase"
                  data-testid={`nav-disabled-${item.to}`}
                >
                  <Icon size={16} />
                  <span className="truncate">{item.label}</span>
                  <Lock size={12} className="ml-auto" />
                </div>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                data-testid={`nav-${item.to}`}
                className={`${base} ${
                  active
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    ))}
  </nav>
);

const Brand: React.FC = () => (
  <Link to="/" className="flex items-center gap-2.5" data-testid="brand-home-link">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
      <Radio size={18} />
    </span>
    <span className="leading-tight">
      <span className="block font-display text-sm font-bold tracking-tight">
        Virtual Telemetry Lab
      </span>
      <span className="block font-mono text-[10px] text-muted-foreground">
        wireless medical telemetry
      </span>
    </span>
  </Link>
);

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border lg:hidden"
                data-testid="mobile-menu-btn"
                aria-label="Open navigation"
              >
                <Menu size={16} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto p-4">
              <div className="mb-5">
                <Brand />
              </div>
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <Brand />

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              client-side simulation · no hardware
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-64 shrink-0 overflow-y-auto border-r border-border px-3 py-5 lg:block">
          <NavList pathname={pathname} />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
};
