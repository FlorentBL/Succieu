import { permanentRedirect } from "next/navigation";

/** Ancienne URL de la console : une seule adresse, dans la coquille du hub. */
export default function LegacyAdminRedirect() {
  permanentRedirect("/espace-bureau/administration");
}
