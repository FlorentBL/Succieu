import Link from "next/link";
import { ModuleIcon } from "@/components/hub/ModuleIcon";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { IconArrowRight } from "@/components/icons/UiIcons";
import { allowedModules, requireHubPageUser } from "@/lib/hub/page-guards";
import { pendingModerationCount, summaryFor } from "@/lib/hub/summaries";
import { isModerator } from "@/lib/hub/users";

export default async function HubHome() {
  const user = await requireHubPageUser();
  const modules = allowedModules(user);
  const summaries = await Promise.all(modules.map((m) => summaryFor(m.id, user)));
  const moderator = isModerator(user);
  const pending = moderator ? await pendingModerationCount() : null;
  return (
    <>
      <PageHero slim title={`Bonjour ${user.displayName}`} description="Choisissez ce que vous souhaitez faire." />
      <PageShell className="pb-16 pt-2 sm:pb-20">
        {modules.length === 0 && !moderator ? (
          <Card className="max-w-xl">
            <h2 className="font-display text-xl font-bold text-moss-dark">Aucun module pour le moment</h2>
            <p className="mt-2 text-ink-muted">
              Votre compte n’a pas encore d’accès. Demandez à l’administrateur du site de vous en donner.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <li key={m.id}>
                <Link
                  href={m.path}
                  className="group/tile block h-full rounded-[1.25rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  <Card className="flex h-full flex-col transition-colors group-hover/tile:border-moss">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pre-pale text-moss-dark">
                      <ModuleIcon name={m.icon} className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 font-display text-xl font-bold text-moss-dark">{m.label}</h2>
                    <p className="mt-1 text-ink-muted">{m.description}</p>
                    {summaries[i] ? (
                      <p className="mt-3 inline-block self-start rounded-full bg-colza-pale px-3 py-1 text-sm font-semibold text-ink">
                        {summaries[i]}
                      </p>
                    ) : null}
                    <span className="mt-auto flex items-center gap-2 pt-4 text-[0.95rem] font-semibold text-moss-dark">
                      {m.level === "read" ? "Consulter" : "Ouvrir"}
                      {m.level === "read" ? (
                        <span className="rounded-full border border-ink-subtle/40 px-2 py-0.5 text-xs font-medium text-ink-muted">
                          Lecture seule
                        </span>
                      ) : null}
                      <IconArrowRight className="h-4 w-4 transition-transform group-hover/tile:translate-x-0.5" />
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
            {moderator ? (
              <li>
                <Link
                  href="/espace-bureau/moderation"
                  className="group/tile block h-full rounded-[1.25rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  <Card className="flex h-full flex-col transition-colors group-hover/tile:border-moss">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pre-pale text-moss-dark">
                      <ModuleIcon name="news" className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 font-display text-xl font-bold text-moss-dark">Modération</h2>
                    <p className="mt-1 text-ink-muted">Relire, publier ou refuser les actualités et rendez-vous proposés.</p>
                    {pending !== null ? (
                      <p className="mt-3 inline-block self-start rounded-full bg-colza-pale px-3 py-1 text-sm font-semibold text-ink">
                        {pending === 0 ? "Rien à valider" : `${pending} à valider`}
                      </p>
                    ) : null}
                    <span className="mt-auto flex items-center gap-2 pt-4 text-[0.95rem] font-semibold text-moss-dark">
                      Ouvrir
                      <IconArrowRight className="h-4 w-4 transition-transform group-hover/tile:translate-x-0.5" />
                    </span>
                  </Card>
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </PageShell>
    </>
  );
}
