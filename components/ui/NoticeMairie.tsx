export function NoticeMairie({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      <p className="font-semibold text-amber-900">À confirmer avec la mairie</p>
      <div className="mt-1 text-amber-950/90">{children}</div>
    </aside>
  );
}
