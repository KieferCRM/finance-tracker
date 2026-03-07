import Link from "next/link";
import { LegalShell } from "./_components";

export default function LegalHomePage() {
  return (
    <LegalShell title="Legal Policies">
      <p>
        This page provides public legal documentation for TipTapped, including policies commonly requested during Plaid application review.
      </p>

      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
        <li>
          <Link href="/legal/privacy">Privacy Policy</Link>
        </li>
        <li>
          <Link href="/legal/terms">Terms of Service</Link>
        </li>
        <li>
          <Link href="/legal/plaid">Plaid Data Access Policy</Link>
        </li>
        <li>
          <Link href="/legal/data-retention">Data Retention and Disposal Policy</Link>
        </li>
        <li>
          <Link href="/legal/access-controls">Access Controls Policy</Link>
        </li>
      </ul>
    </LegalShell>
  );
}
