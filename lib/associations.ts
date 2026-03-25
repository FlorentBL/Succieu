/**
 * Associations locales référencées sur /associations — contenu validé côté commune.
 */

export type AssociationContact =
  | { kind: "link"; label: string; href: string }
  | { kind: "text"; text: string };

export type AssociationBlock = {
  id: string;
  title: string;
  description: string[];
  contacts?: AssociationContact[];
};

export const associationsList: AssociationBlock[] = [
  {
    id: "asn",
    title: "Sport et Nature Succieu (ASN)",
    description: [
      "Cardio, course à pied, marche nordique. Sorties famille le dimanche.",
    ],
    contacts: [
      {
        kind: "link",
        label: "E-mail",
        href: "mailto:sportnaturesuccieu@gmail.com",
      },
      { kind: "text", text: "Facebook : SportNatureSuccieu" },
      {
        kind: "link",
        label: "Site (Sports Regions)",
        href: "https://asn.sportsregions.fr",
      },
    ],
  },
  {
    id: "asstf",
    title: "AS Succieu Terres Froides (ASSTF)",
    description: [
      "Club de rugby au stade du Gapillon. L’association existe depuis 1979 et compte environ 250 licenciés : catégories de l’école de rugby (baby) jusqu’aux seniors, M6 à M19, rugby à V.",
      "Les équipes sont connues sous le nom des « Blacks ». Le club met l’accent sur la convivialité et l’accueil des familles ; l’école de rugby est labellisée par la Fédération française de rugby.",
    ],
    contacts: [
      { kind: "link", label: "Site du club", href: "https://asstf-rugby.fr" },
    ],
  },
  {
    id: "graines-de-grappe",
    title: "Graines de grappe",
    description: [
      "Association culturelle qui propose de semer des « graines de savoir » à travers des ateliers artistiques, culturels et linguistiques, de manière ludique pour les enfants comme pour les parents.",
    ],
    contacts: [
      {
        kind: "link",
        label: "E-mail",
        href: "mailto:grainesdegrappe@gmail.com",
      },
      {
        kind: "link",
        label: "Téléphone",
        href: "tel:+33613554719",
      },
      {
        kind: "link",
        label: "Facebook",
        href: "https://www.facebook.com/profile.php?id=100084835375425",
      },
    ],
  },
  {
    id: "amis-milliassiere",
    title: "Les Amis de Milliassière",
    description: [
      "Association culturelle qui organise le festival de musique au château de Milliassière, site patrimonial de Succieu (label « Patrimoine en Isère »). La programmation mêle musique classique, jazz, spectacles et conférences, avec des artistes reconnus et des talents émergents.",
    ],
    contacts: [
      {
        kind: "link",
        label: "Site du festival",
        href: "https://www.lesamisdemilliassiere.com",
      },
    ],
  },
];
