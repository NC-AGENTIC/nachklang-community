export type StubPageProps = {
  title: string;
  subtitle: string;
};

export function StubPage({ title, subtitle }: StubPageProps) {
  return (
    <main className="workspace" id="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Vorbereitung</p>
          <h1>{title}</h1>
          <h2 className="lead-heading">{subtitle}</h2>
        </div>
      </header>
      <section className="surface-card">
        <p>Diese Seite wird in einem der naechsten Schritte des Roadmaps fertiggestellt.</p>
        <p>
          <a className="button secondary" href="/vault">
            Zum Vault
          </a>
        </p>
      </section>
    </main>
  );
}
