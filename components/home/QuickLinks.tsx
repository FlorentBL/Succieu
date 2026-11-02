import Link from "next/link";
import {
  IconArrowRight,
  IconBin,
  IconDocument,
  IconPeople,
  IconPhone,
  IconSchool,
} from "@/components/icons/UiIcons";

const links = [
  {
    href: "/demarches",
    title: "Mes démarches",
    text: "Carte d’identité, passeport, recensement, urbanisme",
    Icon: IconDocument,
    tone: "bg-ciel text-white",
  },
  {
    href: "/vivre#dechets",
    title: "Déchets et collecte",
    text: "Jours de collecte et déchèteries",
    Icon: IconBin,
    tone: "bg-moss text-white",
  },
  {
    href: "/petite-enfance-ecole",
    title: "École et petite enfance",
    text: "Périscolaire, halte-garderie, assistantes maternelles",
    Icon: IconSchool,
    tone: "bg-colza text-ink",
  },
  {
    href: "/associations",
    title: "Associations et pros",
    text: "Clubs, associations et professionnels du village",
    Icon: IconPeople,
    tone: "bg-pre-pale text-moss-dark",
  },
  {
    href: "/contact",
    title: "Contacter la mairie",
    text: "Téléphone, courriel et numéros d’urgence",
    Icon: IconPhone,
    tone: "bg-tuile text-white",
  },
] as const;

/** Accès directs aux besoins les plus fréquents, chacun dans une couleur du village. */
export function QuickLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Accès rapides" className={className}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {links.map(({ href, title, text, Icon, tone }) => (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              className={`group flex h-full min-h-[7.5rem] flex-col rounded-[1.25rem] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(20,33,26,0.45)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${tone}`}
            >
              <span className="flex items-center justify-between">
                <Icon className="h-7 w-7" />
                <IconArrowRight className="h-5 w-5 opacity-70 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="font-display mt-4 text-lg font-bold leading-tight">
                {title}
              </span>
              <span className="mt-1 text-sm leading-snug opacity-90">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
