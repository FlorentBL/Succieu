import type { CouncilMember } from "@/lib/council";
import { CouncilPhoto } from "./CouncilPhoto";

export function CouncilMemberCard({
  member,
  priority = false,
}: {
  member: CouncilMember;
  priority?: boolean;
}) {
  const isExec = member.category === "executif";
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_1px_0_rgba(26,22,20,0.06),0_12px_40px_-16px_rgba(26,22,20,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(26,22,20,0.08),0_20px_50px_-20px_rgba(26,22,20,0.18)] ${
        isExec
          ? "border-brass/35 ring-1 ring-brass/15"
          : "border-border-subtle"
      }`}
    >
      <CouncilPhoto
        photoFile={member.photoFile}
        name={member.line}
        priority={priority}
      />
      <div className="flex flex-1 flex-col border-t border-border-subtle bg-gradient-to-b from-surface to-canvas/30 px-5 py-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brass">
          {member.role}
        </p>
        <h3 className="font-display mt-1.5 text-lg font-semibold leading-snug text-ink sm:text-xl">
          {member.line}
        </h3>
        <p className="mt-1 text-xs text-ink-subtle">{member.civility}</p>
      </div>
    </article>
  );
}
