import { LegalShell } from "../_components";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@tiptab.app";

export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        TipTab collects and processes personal and financial information to provide budgeting, ledger tracking, and bank transaction sync features.
      </p>

      <section>
        <h2 style={{ marginBottom: 8 }}>Information We Collect</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Account information such as email address and authentication identifiers.</li>
          <li>Ledger data you enter, including income and expense entries and notes.</li>
          <li>Bank transaction and account metadata received through Plaid, if you connect a bank.</li>
          <li>Technical usage data needed for security and service reliability.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>How We Use Information</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>To operate TipTab features and show your financial history and summaries.</li>
          <li>To import and categorize transactions when you enable bank sync.</li>
          <li>To secure accounts, prevent abuse, and troubleshoot product issues.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Data Sharing</h2>
        <p style={{ marginTop: 0 }}>
          We do not sell personal information. We only share information with service providers needed to run the app (for example, Supabase for
          data storage and Plaid for bank connection services) and when required by law.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Data Retention and Deletion</h2>
        <p style={{ marginTop: 0 }}>
          We retain data while your account is active or as needed to provide services and meet legal obligations. You can request account and data
          deletion by contacting us.
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Your Choices</h2>
        <ul style={{ marginTop: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>You can disconnect linked bank accounts from the app.</li>
          <li>You can request access, correction, or deletion of your account data.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Contact</h2>
        <p style={{ marginTop: 0 }}>
          Privacy requests and questions:{" "}
          <a href={`mailto:${supportEmail}`} style={{ color: "var(--mint)" }}>
            {supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
