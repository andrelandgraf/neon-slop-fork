"use client";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

interface MobileNav {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNav>({ open: false, setOpen: () => {} });

/** Tailwind's `md` breakpoint. */
const MOBILE_QUERY = "(max-width: 767.98px)";

function subscribeMobile(listener: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/**
 * Below the `md` breakpoint the sidebar becomes a full-screen drawer, as in
 * the Console. The drawer belongs to the path it was opened on, so any
 * navigation from inside it closes it, and it counts as closed whenever the
 * viewport is wide enough for the regular sidebar.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
  const [openOn, setOpenOn] = useState<string | null>(null);
  const value: MobileNav = {
    open: mobile && openOn === pathname,
    setOpen: (open) => setOpenOn(open ? pathname : null),
  };
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav(): MobileNav {
  return useContext(MobileNavContext);
}

export function MobileNavButton() {
  const { setOpen } = useMobileNav();
  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={() => setOpen(true)}
      className="flex size-7 items-center justify-center rounded-[3px] border border-panel-border bg-panel md:hidden"
    >
      <Menu className="size-4" />
    </button>
  );
}
