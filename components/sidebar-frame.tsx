"use client";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareHeart, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMobileNav } from "@/components/mobile-nav";

const COLLAPSED_KEY = "neon-slop-sidebar-collapsed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function setCollapsed(value: boolean) {
  window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  for (const listener of listeners) listener();
}

const CollapsedContext = createContext(false);

export function useSidebarCollapsed(): boolean {
  return useContext(CollapsedContext);
}

/**
 * The console's sidebar column: nav on the gray canvas, Feedback and
 * "Collapse menu" pinned to the bottom. Collapsing shrinks it to an icon
 * rail and is remembered per browser. On small screens the same column is
 * the full-screen drawer opened from the top bar.
 */
export function SidebarFrame({ children }: { children: React.ReactNode }) {
  const storedCollapsed = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(COLLAPSED_KEY) === "1",
    () => false
  );
  const mobileNav = useMobileNav();
  const collapsed = storedCollapsed && !mobileNav.open;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <CollapsedContext.Provider value={collapsed}>
      <aside
        className={cn(
          "shrink-0 flex-col transition-[width] duration-200 md:flex",
          collapsed ? "md:w-[60px]" : "md:w-[212px]",
          mobileNav.open ? "fixed inset-0 z-50 flex w-full bg-canvas pt-2" : "hidden"
        )}
      >
        {mobileNav.open && (
          <div className="flex justify-end px-3 pb-2 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => mobileNav.setOpen(false)}
              className="flex size-7 items-center justify-center rounded-[3px] border border-panel-border bg-panel"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-3 pb-3">{children}</div>
        <div className="space-y-0.5 px-3 pb-3">
          <NavButton
            icon={MessageSquareHeart}
            label="Feedback"
            onClick={() => setFeedbackOpen(true)}
          />
        </div>
        <div className="border-panel-border border-t px-3 py-2 max-md:hidden">
          <NavButton
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            label={collapsed ? "Expand menu" : "Collapse menu"}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </aside>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </CollapsedContext.Provider>
  );
}

const itemClass =
  "flex h-7 w-full items-center gap-2.5 rounded-[3px] px-3.5 text-left text-nav-foreground text-sm transition-colors hover:bg-nav-active/60 hover:text-foreground";

export function NavLink({
  href,
  icon: Icon,
  label,
  active,
  indent = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  indent?: boolean;
}) {
  const collapsed = useSidebarCollapsed();
  const pathname = usePathname();
  const isActive = active ?? pathname === href.split("?")[0];
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        itemClass,
        indent && !collapsed && "pl-7",
        collapsed && "justify-center px-0",
        isActive && "bg-nav-active font-semibold text-foreground hover:bg-nav-active"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function NavButton({
  icon: Icon,
  label,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  const collapsed = useSidebarCollapsed();
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(itemClass, collapsed && "justify-center px-0")}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && trailing}
    </button>
  );
}

export function NavHeading({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarCollapsed();
  if (collapsed) return <div className="my-2 border-panel-border border-t" />;
  return (
    <div className="px-1 pt-1 pb-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
      {children}
    </div>
  );
}

const ISSUES_URL = "https://github.com/andrelandgraf/neon-slop-fork/issues/new";

function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const href = `${ISSUES_URL}?${new URLSearchParams({
    title: "Feedback",
    body: text,
  })}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>
            This clone has no feedback inbox. Your note opens as a GitHub issue
            on the repository.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What would make this better?"
          rows={5}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!text.trim()}
            nativeButton={false}
            render={<a href={href} target="_blank" rel="noreferrer" />}
            onClick={() => onOpenChange(false)}
          >
            Open GitHub issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
