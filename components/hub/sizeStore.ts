/** Taille du texte réglable de l'espace bureau : mémorisée dans le navigateur, appliquée à <html> (tout est en rem). */
export const TEXT_SIZES = [
  { id: "petit", label: "Petit", percent: 93.75 },
  { id: "normal", label: "Normal", percent: 100 },
  { id: "grand", label: "Grand", percent: 118.75 },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];
export const TEXT_SIZE_KEY = "succieu-hub-taille";
export const TEXT_SIZE_EVENT = "hub-text-size";

export function readTextSize(): TextSizeId {
  try {
    const v = localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.some((s) => s.id === v) ? (v as TextSizeId) : "normal";
  } catch {
    return "normal";
  }
}

export function applyTextSize(id: TextSizeId) {
  const size = TEXT_SIZES.find((s) => s.id === id) ?? TEXT_SIZES[1];
  document.documentElement.style.fontSize = `${size.percent}%`;
}

export function saveTextSize(id: TextSizeId) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, id);
  } catch {
    /* stockage indisponible : le réglage vaut pour la page seulement */
  }
  applyTextSize(id);
  window.dispatchEvent(new Event(TEXT_SIZE_EVENT));
}

/** Script inline : applique la taille avant l'affichage (évite un saut de mise en page). */
export const TEXT_SIZE_SCRIPT = `try{var s=localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});var p={petit:93.75,normal:100,grand:118.75}[s];if(p)document.documentElement.style.fontSize=p+"%"}catch(e){}`;
