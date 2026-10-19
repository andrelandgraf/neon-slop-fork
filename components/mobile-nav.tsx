"use client";
import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

interface MobileNav {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNav>({ open: false, setOpen: () => {} });

/**
 * Below the `md` breakpoint the sidebar becomes a full-screen drawer, as in
 * the Console. The drawer belongs to the path it was opened on, so any
 * navigation from inside it closes it.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const value: MobileNav = {
    open: openOn === pathname,
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
