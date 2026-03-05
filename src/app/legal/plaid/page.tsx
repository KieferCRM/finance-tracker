import Link from "next/link";
import { LegalShell } from "../_components";

export default function PlaidPolicyPage() {
  return (
    <LegalShell title="Plaid Data Access Policy">
      <p>
        TipTab uses Plaid to let users securely connect financial accounts and import transaction data into the app.
      </p>

      <section>
        <h2 style={{ marginBottom: 8 }}>What We Access Through Plaid</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Account identifiers and account metadata (for example account name and mask).</li>
          <li>Transaction history used to populate budgeting and reporting views.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>How Plaid Data Is Used</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>To sync account transactions into user-visible ledgers and reports.</li>
          <li>To categorize and summarize spending trends inside TipTab.</li>
          <li>To support user-requested bank reconnection and debugging.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>How Users Can Revoke Access</h2>
        <p style={{ marginTop: 0 }}>
          Users can disconnect linked bank items from the app. Once disconnected, new Plaid data sync stops. Users may also request deletion of
          previously synced data through support.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Related Policies</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>
            <Link href="/legal/privacy" style={{ color: "var(--mint)" }}>
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/legal/terms" style={{ color: "var(--mint)" }}>
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="/legal/data-retention" style={{ color: "var(--mint)" }}>
              Data Retention and Disposal Policy
            </Link>
          </li>
        </ul>
      </section>
    </LegalShell>
  );
}
