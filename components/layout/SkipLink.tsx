export function SkipLink() {
  return (
    <a
      href="#contenu-principal"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-focus)]"
    >
      Aller au contenu principal
    </a>
  );
}
