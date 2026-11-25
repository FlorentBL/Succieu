import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";

/** Cadre des pages de modération : la session admin est vérifiée côté serveur par la page. */
export function ModerationFrame({
  title,
  back,
  children,
}: {
  title: string;
  back: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <>
      <PageHero
        slim
        title={title}
        description="Relecture, publication et refus des saisies des élus."
      />
      <PageShell className="py-4 sm:py-6">
        <div className="mb-4">
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center font-semibold text-moss-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {back.label}
          </Link>
        </div>
        {children}
      </PageShell>
    </>
  );
}
