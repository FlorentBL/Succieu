export const siteConfig = {
  name: "Mairie de Succieu",
  shortName: "Succieu",
  tagline: "Porte des Terres Froides",
  description:
    "Site officiel de la commune de Succieu (Isère) : informations municipales, démarches, vie locale et déchets.",
  locale: "fr-FR",
  phone: "04 74 92 00 42",
  phoneTel: "tel:+33474920042",
  /** À compléter / valider avec la mairie */
  postalCode: "38300",
  city: "Succieu",
  country: "France",
  emails: {
    urbanisme: "urbanisme@succieu.fr",
    ccas: "ccas@succieu.fr",
    periscolaire: "periscolaire@succieu.fr",
    enquetePlu: "enquetepublique.succieu@gmail.com",
  },
  urls: {
    capi: "https://capi-agglo.fr",
    smnd: "http://www.smnd.fr/Succieu.html",
    regionTransport: "https://www.laregionvoustransporte.fr",
    ruban: "https://www.rubantransport.com",
    lane: "https://www.lanemove.com",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const mainNav: NavItem[] = [
  { label: "Accueil", href: "/" },
  {
    label: "Ma Mairie",
    href: "/ma-mairie",
    children: [
      { label: "Conseil municipal", href: "/ma-mairie/conseil" },
      { label: "CCAS", href: "/ma-mairie/ccas" },
      { label: "Identité & histoire", href: "/ma-mairie/identite" },
    ],
  },
  {
    label: "Mes démarches",
    href: "/demarches",
    children: [
      { label: "Démarches administratives", href: "/demarches/administratif" },
      { label: "Urbanisme", href: "/demarches/urbanisme" },
    ],
  },
  { label: "Vivre à Succieu", href: "/vivre" },
  { label: "Petite enfance & école", href: "/petite-enfance-ecole" },
  { label: "Participation citoyenne", href: "/participation" },
  { label: "Associations", href: "/associations" },
  { label: "Contact", href: "/contact" },
];
