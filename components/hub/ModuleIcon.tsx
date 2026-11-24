import { IconDocument, IconPeople, IconPin, IconClock } from "@/components/icons/UiIcons";
import type { ModuleIcon as ModuleIconName } from "@/lib/hub/modules";

const ICONS: Record<ModuleIconName, (p: { className?: string }) => React.ReactElement> = {
  news: IconDocument,
  people: IconPeople,
  room: IconPin,
  documents: IconClock,
};

export function ModuleIcon({ name, className }: { name: ModuleIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
