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
          className="h-7 w-7 rounded-full overflow-hidden border bg-gradient-to-br from-indigo-500 to-pink-500 grid place-items-center text-[11px] font-semibold text-white"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {email}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          disabled={pending}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
