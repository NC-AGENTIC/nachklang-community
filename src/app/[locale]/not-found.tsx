import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <main style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <h1>404</h1>
      <p>Seite nicht gefunden.</p>
      <Link href="/">Zur Startseite</Link>
    </main>
  );
}
