"use client";
import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="top-right" richColors theme={resolvedTheme} />;
}
