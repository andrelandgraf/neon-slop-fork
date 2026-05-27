import { cn } from "@/lib/utils";

/**
 * The official Neon logomark (the "N" cutout).
 *
 * Path is the verbatim 64×64 logomark shipped in the Neon brand kit
 * (`Neon/logomark/.../neon-logomark-*.svg`). Fill is `currentColor` so
 * callers can tint via Tailwind's `text-*` utilities — pass
 * `text-[#37C38F]` (the official brand green) on light surfaces, or
 * `text-white` on the dark sidebar / hero.
 */
export function NeonLogomark({
  className,
  title = "Neon",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
    >
      <title>{title}</title>
      <path d="M63 0.0177909V63.5526L38.4178 42.2501V63.5526H0V0L63 0.0177909ZM7.72251 55.8389H30.6953V25.3238L55.2779 47.0476V7.72922L7.72251 7.71559V55.8389Z" />
    </svg>
  );
}
