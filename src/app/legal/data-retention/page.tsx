import { LegalShell } from "../_components";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@tiptab.app";

export default function DataRetentionPolicyPage() {
  return (
    <LegalShell title="Data Retention and Disposal Policy">
      <p>
        This policy explains how TipTapped retains and disposes of user and financial data, including data accessed through Plaid.
      </p>

      <section>
        <h2 style={{ marginBottom: 8 }}>Data We Retain</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Account profile data (such as email and authentication identifiers).</li>
          <li>User-entered ledger data (income, expenses, categories, and notes).</li>
          <li>Plaid-connected account metadata and synced transaction history, when bank sync is enabled.</li>
          <li>Security and operational logs needed for abuse prevention and troubleshooting.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Retention Periods</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Account and ledger data is retained while the account is active.</li>
          <li>Plaid access data is retained only while a connection is active and is removed when a user disconnects the item.</li>
          <li>Deleted records may remain in encrypted backups for up to 35 days before permanent expiration.</li>
          <li>Operational logs are retained for up to 90 days unless a longer period is required for security or legal compliance.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Disposal and Deletion</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Users can request account deletion and data disposal by contacting support.</li>
          <li>Upon verified request, primary account and application data is deleted within 30 days.</li>
          <li>Residual backup copies are automatically purged at the end of the backup retention window.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Contact</h2>
        <p style={{ marginTop: 0 }}>
          Data retention and disposal requests: {" "}
          <a href={`mailto:${supportEmail}`} style={{ color: "var(--mint)" }}>
            {supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
