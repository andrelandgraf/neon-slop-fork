"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { ThemeMenuItems } from "@/components/theme-menu-items";

export function AccountMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      try {
        await signOut();
        router.push("/");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-out failed.");
      }
    });
  }

  const initial = (name?.[0] ?? email[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="grid size-7 place-items-center overflow-hidden rounded-full border border-border/60 bg-neon-dark font-semibold text-[11px] text-neon-green ring-1 ring-primary/20 transition-shadow hover:ring-primary/40"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name} className="size-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <User className="size-3.5" />
            <div className="min-w-0">
              <div className="truncate font-medium text-sm">{name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {email}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          disabled={pending}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
