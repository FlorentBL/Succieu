import Image from "next/image";
import Link from "next/link";
import { logoSrc } from "@/lib/branding";

type Props = {
  variant?: "header" | "footer";
  className?: string;
};

/** Dimensions du PNG recadré (`public/logo-succieu-trim.png`) — ratio d’affichage pour `next/image`. */
const LOGO_INTRINSIC = { w: 1000, h: 477 } as const;

export function SiteLogo({ variant = "header", className = "" }: Props) {
  const isHeader = variant === "header";
  const w = isHeader ? LOGO_INTRINSIC.w : 200;
  const h = isHeader ? LOGO_INTRINSIC.h : Math.round((200 * LOGO_INTRINSIC.h) / LOGO_INTRINSIC.w);
  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${className}`}
    >
      <Image
        src={logoSrc}
        alt="Succieu — commune nature"
        width={w}
        height={h}
        className={`object-contain object-left ${
          isHeader
            ? "h-12 w-auto sm:h-14"
            : "h-16 w-auto brightness-0 invert"
        }`}
        priority={isHeader}
      />
    </Link>
  );
}
