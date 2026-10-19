"use client";
import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="bottom-center" richColors closeButton theme={resolvedTheme} />;
}
