import { cn } from "@/lib/utils";

/**
 * StudyFlow AI brand mark — a gradient squircle holding an open-book glyph
 * (study) with an AI "spark" accent. Pure SVG, scales crisply at any size.
 */
export function BrandMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="StudyFlow AI"
      className={className}
    >
      <defs>
        <linearGradient id="sf-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sf-spark" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      {/* tile + subtle top highlight */}
      <rect width="32" height="32" rx="9" fill="url(#sf-tile)" />
      <rect width="32" height="32" rx="9" fill="white" fillOpacity="0.06" />

      {/* open book */}
      <path d="M16 11 C 12.8 9, 9 9, 6 10.6 L 6 22 C 9 20.4, 12.8 20.4, 16 22.4 Z" fill="white" fillOpacity="0.96" />
      <path d="M16 11 C 19.2 9, 23 9, 26 10.6 L 26 22 C 23 20.4, 19.2 20.4, 16 22.4 Z" fill="white" fillOpacity="0.78" />
      <path d="M16 11 L16 22.4" stroke="#4f46e5" strokeOpacity="0.3" strokeWidth="0.8" strokeLinecap="round" />

      {/* AI spark */}
      <path
        d="M24.5 4 L25.25 6.25 L27.5 7 L25.25 7.75 L24.5 10 L23.75 7.75 L21.5 7 L23.75 6.25 Z"
        fill="url(#sf-spark)"
      />
    </svg>
  );
}

/**
 * Full lockup: brand mark + "StudyFlow AI" wordmark. Set `showText={false}`
 * for the icon-only form (collapsed sidebar, avatars, etc.).
 */
export function BrandLogo({
  showText = true,
  size = 32,
  className,
  textClassName,
}: {
  showText?: boolean;
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} className="shrink-0 drop-shadow-sm" />
      {showText && (
        <span className={cn("flex items-baseline gap-1 font-bold tracking-tight leading-none", textClassName)}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">StudyFlow</span>
          <span className="text-[0.62em] font-extrabold uppercase tracking-[0.15em] text-amber-500">AI</span>
        </span>
      )}
    </div>
  );
}
