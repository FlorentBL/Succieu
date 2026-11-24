import { ModerationFrame } from "@/components/moderation/ModerationFrame";
import { ModerationList } from "@/components/moderation/ModerationList";
import { requireModerationPage } from "@/lib/hub/page-guards";

export default async function ModerationPage() {
  await requireModerationPage();
  return (
    <ModerationFrame title="Modération des saisies" back={{ href: "/espace-bureau/actualites", label: "← Actualités & agenda" }}>
      <ModerationList />
    </ModerationFrame>
  );
}
