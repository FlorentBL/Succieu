/**
 * Prompt de référence (@ui-designer + @ux-architect) pour poursuivre la refonte front.
 * Copier-coller dans Cursor si besoin d’itérations ultérieures.
 */
export const FRONT_REWORK_PROMPT = `Contexte : site municipal Next.js + Tailwind (Succieu), identité « commune nature », logo noir & blanc.

Objectifs UI/UX :
- Augmenter la respiration : marges verticales généreuses (sections 24–32), grille alignée sur max-w-6xl, padding horizontal cohérent (px-4 sm:px-6 lg:px-8).
- Hiérarchie typographique : petit libellé en capitales espacées (bronze), titre Playfair, corps Source Sans 1.65–1.75 de interlignage.
- Cartes : ombre douce, bordure légère, hover discret ; liens avec indication de suite (flèche ou soulignement).
- Alternance légère fond surface / canvas pour structurer le scroll.
- Rester sobre et accessible (contraste AA, focus visible).

Fichiers à privilégier : app/globals.css, app/page.tsx, components/ui/*, components/layout/SiteHeader.tsx, app/ma-mairie/conseil/page.tsx.`;
