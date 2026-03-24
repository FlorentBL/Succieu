/**
 * Professionnels et services de proximité — Succieu.
 * Tri alphabétique sur `name` à l’export (locale fr).
 * Les fiches sont à affiner (téléphones, liens Maps) avec la mairie.
 */

export type Professional = {
  id: string;
  /** Nom affiché (titre de la carte) */
  name: string;
  /** Texte court : activité, public, spécificité locale */
  serviceDescription: string;
  /** Numéro affiché (espaces ok) */
  phone?: string;
  website?: string;
  /** Adresse ou repère pour contextualiser / recherche Maps */
  addressLine?: string;
  /** Lien « Partager » Google Maps (recommandé) ; sinon recherche nom + adresse (voir mapsSearchUrl) */
  mapsUrl?: string;
};

/**
 * Lien de recherche Google Maps (nom + adresse). Pour une fiche exacte, remplacer par
 * l’URL « Partager » depuis la fiche Google Business (équivalent du résultat INNERLIFT).
 */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const raw: Professional[] = [
  {
    id: "armanet-negoce",
    name: "Armanet Négoce",
    serviceDescription:
      "Chaudronnerie : fabrication et travaux de métallerie.",
    phone: "06 58 68 46 51",
    addressLine: "70 Le Javet, 38300 Succieu",
    mapsUrl: mapsSearchUrl("ARMANET NEGOCE 70 Le Javet 38300 Succieu"),
  },
  {
    id: "biard-demenagements",
    name: "Biard Déménagements",
    serviceDescription:
      "Déménagements particuliers et professionnels (réseau Biard, présence en Rhône-Alpes). Agence de zone à la route de Sérézin.",
    phone: "05 31 61 37 37",
    website: "https://www.biard-demenagements.fr",
    addressLine: "1806 route de Sérézin, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "Biard Déménagements 1806 route de Sérézin 38300 Succieu",
    ),
  },
  {
    id: "dallaine-dslcom",
    name: "DSLCOM — Stéphane Dallaine",
    serviceDescription:
      "Électricien : installation, dépannage et mise aux normes (artisan à Succieu).",
    phone: "06 61 80 86 82",
    addressLine: "19 Le Javet, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "DSLCOM Dallaine Stéphane électricien 19 Le Javet 38300 Succieu",
    ),
  },
  {
    id: "comte-elec",
    name: "Comte Elec",
    serviceDescription:
      "Électricité générale : installations, dépannage, mise aux normes.",
    phone: "06 89 93 48 92",
    website: "https://www.comte-elec.fr",
    addressLine: "51 Impasse du Césard, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "Comte Elec 51 Impasse du Césard 38300 Succieu",
    ),
  },
  {
    id: "fbl-digital",
    name: "FBL Digital",
    serviceDescription:
      "Consultant informatique : conseil et services numériques pour particuliers et professionnels. Horaires annoncés : ouvert 24h/24 (fiche Google Maps).",
    phone: "06 48 77 06 63",
    website: "https://fbldigital.fr",
    addressLine: "15 Impasse du Pré Vert, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "FBL Digital 15 Impasse du Pré Vert 38300 Succieu",
    ),
  },
  {
    id: "fms-ramonage",
    name: "FMS Ramonage",
    serviceDescription:
      "Ramonage de cheminées, entretien des appareils et vérification des éléments de sécurité (sur rendez-vous).",
    phone: "06 16 30 80 51",
    addressLine: "1d Les Routes, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "FMS RAMONAGE 1d Les Routes 38300 Succieu",
    ),
  },
  {
    id: "gamos-transports",
    name: "Gamos Transports",
    serviceDescription:
      "Service de transport et déménagement (zone route de Sérézin).",
    phone: "04 74 18 55 60",
    website: "https://gamos-transport-et-demenagement.com",
    addressLine: "1806 route de Sérézin, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "GAMOS transports 1806 route de Sérézin 38300 Succieu",
    ),
  },
  {
    id: "gary-automobiles",
    name: "Gary Automobiles",
    serviceDescription:
      "Concessionnaire : véhicules neufs et d’occasion, livraison, import et démarches carte grise ; accueil français / anglais. Tél. 04 74 43 89 51 également.",
    phone: "06 84 85 04 61",
    website: "http://www.gary-automobiles.com",
    addressLine: "265 Garine, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "Gary Automobiles 265 Garine 38300 Succieu",
    ),
  },
  {
    id: "id-couture",
    name: "ID Couture",
    serviceDescription:
      "Atelier de couture : retouches, créations sur mesure ; achat en magasin et retrait sur place.",
    phone: "06 64 70 60 21",
    addressLine: "293 Le Javet, 38300 Succieu",
    mapsUrl: mapsSearchUrl("ID Couture 293 Le Javet 38300 Succieu"),
  },
  {
    id: "innerlift",
    name: "Innerlift",
    serviceDescription:
      "Fournitures industrielles, équipement de manutention, quincaillerie et consommables (INNERCOM).",
    phone: "04 74 28 47 03",
    website: "https://www.innerlift.fr",
    addressLine: "212 Le Javet, 38300 Succieu",
    mapsUrl: mapsSearchUrl("INNERLIFT 212 Le Javet 38300 Succieu"),
  },
  {
    id: "atelier-terres-froides",
    name: "L’Atelier des Terres Froides",
    serviceDescription:
      "Atelier d’art et ébénisterie : création et restauration de mobilier et boiseries.",
    phone: "06 03 94 83 45",
    website: "https://www.latelierdesterresfroides.com",
    addressLine: "1272 Les Grailles, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "L'Atelier des Terres Froides 1272 Les Grailles 38300 Succieu",
    ),
  },
  {
    id: "la-soierie",
    name: "La Soierie",
    serviceDescription:
      "Centre d’affaires — location de salles de réunion, séminaires et événements professionnels (site patrimonial).",
    phone: "06 75 86 90 69",
    website: "https://www.la-soierie.com",
    addressLine: "31 Route des Grailles, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "La Soierie 31 Route des Grailles 38300 Succieu",
    ),
  },
  {
    id: "les-jacines",
    name: "Les Jacines",
    serviceDescription:
      "Gîte et chambres d’hôtes au parc du château de Milliassière (hébergement, séjours).",
    phone: "06 84 51 84 92",
    website: "https://les-jacines.fr",
    addressLine: "336 route de Buffières, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "Les Jacines 336 route de Buffières 38300 Succieu",
    ),
  },
  {
    id: "ofull",
    name: "Ofull — Bien-être & habitat",
    serviceDescription:
      "Entrepreneur spécialisé en décoration d’intérieur et accompagnement habitat (partenaire bien-être & habitat).",
    phone: "07 56 82 68 47",
    website: "https://ofull.fr",
    addressLine: "105 Montée des routes, 38300 Succieu",
    mapsUrl: mapsSearchUrl(
      "Ofull décoration intérieur 105 Montée des routes 38300 Succieu",
    ),
  },
];

function sortProfessionals(list: Professional[]): Professional[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
  );
}

export const professionalsList = sortProfessionals(raw);

/** Pour liens tel: depuis un numéro FR affiché (0X XX XX XX XX) */
export function phoneToTelHref(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `tel:+33${digits.slice(1)}`;
  }
  return `tel:${digits}`;
}
