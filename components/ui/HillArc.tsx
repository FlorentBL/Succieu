/**
 * L’arc de colline du logo : montée douce depuis la gauche, sommet aux deux tiers,
 * descente plus raide à droite.
 * - `line` : tracé fin (séparateur, signature) ;
 * - `fill` : la colline pleine, pour découper le bas d’un bandeau ou d’une photo.
 */
const LINE = "M0 112 C 240 52, 470 6, 680 6 C 840 6, 950 60, 1000 112";
const FILL = `${LINE} L1000 120 L0 120 Z`;

export function HillArc({
  variant = "line",
  className = "",
  strokeWidth = 1.5,
}: {
  variant?: "line" | "fill";
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 1000 120"
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      aria-hidden
      focusable="false"
    >
      {variant === "fill" ? (
        <path d={FILL} fill="currentColor" />
      ) : (
        <path
          d={LINE}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
