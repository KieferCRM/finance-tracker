import { LegalShell } from "../_components";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@tiptab.app";

export default function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These Terms of Service govern your use of TipTapped. By creating an account or using the service, you agree to these terms.
      </p>

      <section>
        <h2 style={{ marginBottom: 8 }}>Use of Service</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>You must provide accurate information and keep your login credentials secure.</li>
          <li>You may only use the service for lawful personal or business financial tracking.</li>
          <li>You may not misuse, disrupt, or attempt unauthorized access to the service.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Bank Connectivity</h2>
        <p style={{ marginTop: 0 }}>
          Bank connections are provided through Plaid. By linking accounts, you authorize us and Plaid to access account and transaction data needed
          to provide synchronization features.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>No Financial Advice</h2>
        <p style={{ marginTop: 0 }}>
          TipTapped provides information tools only and does not provide legal, tax, accounting, or investment advice.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Service Availability</h2>
        <p style={{ marginTop: 0 }}>
          We may modify, suspend, or discontinue any feature at any time. We do not guarantee uninterrupted service availability.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Limitation of Liability</h2>
        <p style={{ marginTop: 0 }}>
          To the maximum extent permitted by law, TipTapped is provided as-is without warranties, and we are not liable for indirect or consequential
          damages arising from use of the service.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Contact</h2>
        <p style={{ marginTop: 0 }}>
          Questions about these terms:{" "}
          <a href={`mailto:${supportEmail}`} style={{ color: "var(--mint)" }}>
            {supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
