import Image from "next/image";
import Link from "next/link";
import { logoSrc } from "@/lib/branding";

type Props = {
  variant?: "header" | "footer";
  className?: string;
};

/** Dimensions natives du PNG officiel (`public/logo-succieu.png`) — ratio d’affichage pour `next/image`. */
const LOGO_INTRINSIC = { w: 3370, h: 2384 } as const;

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
        className={`h-auto object-contain object-left ${
          isHeader
            ? "w-[min(100%,380px)] max-h-[5rem] sm:max-h-[5.5rem] lg:max-h-[6rem]"
            : "max-w-[min(100%,220px)] max-h-14 brightness-0 invert opacity-95"
        }`}
        priority={isHeader}
      />
    </Link>
  );
}
