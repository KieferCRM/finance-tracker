# TipTab Access Controls Policy

Effective date: March 5, 2026
Owner: TipTab Security / Operations

## Purpose
This policy defines how TipTab restricts and monitors access to systems and data, including data accessed through Plaid.

## Scope
This policy applies to production infrastructure, application services, databases, logs, and administrative tools used to operate TipTab.

## Access Control Principles
- Least privilege: users and team members are granted only the minimum access required for their responsibilities.
- Need-to-know: access to production and customer data is limited to approved support and operational purposes.
- Role-based access: administrative permissions are restricted to designated personnel.

## Authentication and Authorization Controls
- Administrative tools require strong unique credentials and multi-factor authentication where supported.
- Production secrets are managed in secure environment variables and are not stored in public repositories.
- Access to user data in the application is scoped to authenticated users and enforced by database access policies.

## Monitoring and Logging
- Access to production systems is logged and reviewed during security investigations and operational audits.
- Suspicious authentication attempts and unusual access patterns are investigated promptly.

## Access Reviews
- Access privileges are reviewed at least annually.
- Access is re-evaluated upon role changes, infrastructure changes, and security events.

## Offboarding and Access Revocation
- Access is revoked promptly when personnel no longer require access.
- Credentials, tokens, and environment-level access are disabled during offboarding.

## Policy Review and Enforcement
- This policy is reviewed at least annually and when material security, legal, or operational changes occur.
- Violations of this policy may result in immediate access removal and remediation actions.

## Contact
For access controls and security questions, contact:
routeflowsystems@gmail.com

## Public Reference
Public policy page:
https://tiptab.vercel.app/legal/access-controls
