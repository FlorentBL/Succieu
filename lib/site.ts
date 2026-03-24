export const siteConfig = {
  name: "Mairie de Succieu",
  shortName: "Succieu",
  tagline: "Porte des Terres Froides",
  description:
    "Site officiel de la commune de Succieu (Isère) : informations municipales, démarches, vie locale et déchets.",
  locale: "fr-FR",
  phone: "04 74 92 00 42",
  phoneTel: "tel:+33474920042",
  /** Adresse postale de la mairie */
  streetAddress: "925 Le Village",
  postalCode: "38300",
  city: "Succieu",
  country: "France",
  /** Horaires d’accueil à la mairie (permanences) */
  mairieOpeningHours: [
    { day: "Lundi", hours: "Fermé" },
    { day: "Mardi", hours: "08:00 – 12:00" },
    { day: "Mercredi", hours: "Fermé" },
    { day: "Jeudi", hours: "08:00 – 12:00" },
    { day: "Vendredi", hours: "14:00 – 18:00" },
    { day: "Samedi", hours: "08:30 – 12:00" },
    { day: "Dimanche", hours: "Fermé" },
  ],
  emails: {
    /** Courriel général de la mairie */
    mairie: "Mairie@succieu.fr",
    urbanisme: "urbanisme@succieu.fr",
    ccas: "ccas@succieu.fr",
    periscolaire: "periscolaire@succieu.fr",
    enquetePlu: "enquetepublique.succieu@gmail.com",
  },
  urls: {
    /** Page publique PanneauPocket (lien direct, hors iframe) */
    panneauPocket:
      "https://app.panneaupocket.com/ville/110180054-succieu-38300",
    /**
     * Widget officiel (`embeded`, pas embedded) — id commune = 110180054.
     * Fourni par l’interface d’admin PanneauPocket si besoin de mise à jour.
     */
    panneauPocketEmbed:
      "https://app.panneaupocket.com/embeded/110180054?mode=widget",
    capi: "https://capi-agglo.fr",
    smnd: "http://www.smnd.fr/Succieu.html",
    /** Horaires et accès aux déchèteries (SMND) */
    smndDechetteriesHoraires:
      "https://smnd.fr/decheteries/horaires-et-acces/",
    regionTransport: "https://www.laregionvoustransporte.fr",
    ruban: "https://www.rubantransport.com",
    lane: "https://www.lanemove.com",
    /** France Titres (ANTS) — pré-demande, mairies équipées */
    franceTitres: "https://passeport.ants.gouv.fr",
    antsGouv: "https://ants.gouv.fr",
    servicePublic: "https://www.service-public.fr",
    servicePublicPasseport:
      "https://www.service-public.fr/particuliers/vosdroits/F10403",
    servicePublicCni:
      "https://www.service-public.fr/particuliers/vosdroits/N358",
    servicePublicRecensement:
      "https://www.service-public.fr/particuliers/vosdroits/F870",
    /** Document d’urbanisme officiellement publié (PLU, etc.) */
    geoportailUrbanisme: "https://www.geoportail-urbanisme.gouv.fr",
    /** Déchetteries du territoire CAPI */
    capiDechetteries:
      "https://capi-agglo.fr/vos-services/services-urbains/dechetteries/",
    /** Autonomie, handicap, téléassistance (Département) */
    isereAutonomie: "https://www.isere.fr/autonomie",
    /** CAF de l’Isère — petite enfance, aides */
    cafIsere: "https://www.caf.fr/allocataires/caf-de-l-isere",
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
  { label: "Associations & professionnels", href: "/associations" },
  { label: "Contact", href: "/contact" },
];
