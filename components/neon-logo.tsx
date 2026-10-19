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
/**
 * The official Neon logo (logomark + wordmark), from the brand kit's
 * `neon-logo-light-color.svg`. The mark keeps brand green; the wordmark
 * follows `currentColor` so it inverts with the theme.
 */
export function NeonWordmark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Neon"
      viewBox="0 0 157 45"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[18px] w-auto", className)}
    >
      <title>Neon</title>
      <path
        d="M43.9855 0.0123174V44L26.9857 29.2514V44H0.417969V0L43.9855 0.0123174ZM5.75846 38.6595H21.6452V17.5326L38.6453 32.5729V5.35124L5.75846 5.34181V38.6595Z"
        fill="#37C38F"
      />
      <path
        d="M79.0696 35.7042L62.1559 20.7349V35.4106H56.8359V9.06775L73.7497 24.037V9.36126H79.0696V35.7042ZM84.9261 35.4106V9.36126H100.849V14.6078H90.2461V19.7443H98.6479V24.8808H90.2461V30.1641H100.849V35.4106H84.9261ZM117.319 35.7042C109.944 35.7042 104 29.7605 104 22.386C104 15.0114 109.944 9.06775 117.319 9.06775C124.693 9.06775 130.637 15.0114 130.637 22.386C130.637 29.7605 124.693 35.7042 117.319 35.7042ZM117.319 30.5677C121.868 30.5677 125.28 26.8987 125.28 22.386C125.28 17.8732 121.868 14.2042 117.319 14.2042C112.769 14.2042 109.357 17.8732 109.357 22.386C109.357 26.8987 112.769 30.5677 117.319 30.5677ZM156.492 35.7042L139.578 20.7349V35.4106H134.258V9.06775L151.172 24.037V9.36126H156.492V35.7042Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
