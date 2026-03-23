import Image from "next/image";
import Link from "next/link";
import { logoSrc } from "@/lib/branding";

type Props = {
  variant?: "header" | "footer";
  className?: string;
};

export function SiteLogo({ variant = "header", className = "" }: Props) {
  const isHeader = variant === "header";
  const w = isHeader ? 220 : 180;
  const h = isHeader ? 52 : 42;
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
        className={`h-auto max-w-[min(100%,220px)] object-contain object-left ${
          isHeader ? "max-h-[3.25rem]" : "max-h-10 brightness-0 invert opacity-95"
        }`}
        priority={isHeader}
      />
    </Link>
  );
}
