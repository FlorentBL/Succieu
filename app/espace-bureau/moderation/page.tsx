import { AdminGate } from "@/components/moderation/AdminGate";
import { ModerationList } from "@/components/moderation/ModerationList";

export default function ModerationPage() {
  return (
    <AdminGate title="Modération des saisies">
      <ModerationList />
    </AdminGate>
  );
}
