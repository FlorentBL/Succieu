import { ModerationFrame } from "@/components/moderation/ModerationFrame";
import { SubmissionDetail } from "@/components/moderation/SubmissionDetail";
import { requireModerationPage } from "@/lib/hub/page-guards";

export default async function ModerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModerationPage();
  const { id } = await params;
  return (
    <ModerationFrame title="Détail de la saisie" back={{ href: "/espace-bureau/actualites/moderation", label: "← Toutes les saisies" }}>
      <SubmissionDetail id={id} />
    </ModerationFrame>
  );
}
