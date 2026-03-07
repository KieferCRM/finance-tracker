import { LegalShell } from "../_components";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@tiptab.app";

export default function AccessControlsPolicyPage() {
  return (
    <LegalShell title="Access Controls Policy">
      <p>
        This policy describes the administrative, technical, and operational controls TipTapped uses to restrict and monitor access to customer data,
        including data obtained through Plaid.
      </p>

      <section>
        <h2 style={{ marginBottom: 8 }}>Access Principles</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Least privilege: team members are granted only the minimum access needed for their role.</li>
          <li>Need-to-know: access to production data is limited to approved operational and support purposes.</li>
          <li>Separation of duties: sensitive actions require elevated authorization and are restricted to designated admins.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Authentication and Authorization</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Administrative systems use strong unique credentials and multi-factor authentication where supported.</li>
          <li>Production secrets are stored in managed environment variables and are not embedded in source code.</li>
          <li>User-facing data access is scoped to authenticated users and enforced at the database policy level.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Monitoring and Logging</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Access to production systems is logged and reviewed during security and incident investigations.</li>
          <li>Suspicious activity, failed authentication events, and unusual access patterns are investigated promptly.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Access Reviews and Offboarding</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Access privileges are reviewed at least annually and after material infrastructure or team changes.</li>
          <li>When personnel no longer require access, credentials and permissions are revoked promptly.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Policy Governance</h2>
        <p style={{ marginTop: 0 }}>
          This policy is reviewed at least annually and updated when material changes occur to security controls, infrastructure, or legal obligations.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Contact</h2>
        <p style={{ marginTop: 0 }}>
          Access controls and security inquiries:{" "}
          <a href={`mailto:${supportEmail}`} style={{ color: "var(--mint)" }}>
            {supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
