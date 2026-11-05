import { AdminGate } from "@/components/moderation/AdminGate";
import { SubmissionDetail } from "@/components/moderation/SubmissionDetail";

export default async function ModerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminGate
      title="Détail de la saisie"
      back={{ href: "/espace-bureau/moderation", label: "← Toutes les saisies" }}
    >
      <SubmissionDetail id={id} />
    </AdminGate>
  );
}
