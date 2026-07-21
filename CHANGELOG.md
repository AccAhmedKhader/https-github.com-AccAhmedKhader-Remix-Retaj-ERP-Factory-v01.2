# Changelog

All notable changes to the **ApexSaaS ERP** system will be documented in this file.

## [1.1.0] - 2026-07-21

### Security Fixes (P0)

- **[P0-1] Fixed Privilege Escalation in `hasPermission()` (`src/core/security/rbac.ts`):**
  - Completely removed the generic admin and `security:admin` bypass logic inside `SecurityPermissionEngine.hasPermission()`.
  - Defined all permission scopes explicitly for every role under `ROLE_PERMISSIONS`.
  - Added new scope `"platform:full_access"` explicitly assigned only to `SuperAdmin`.
  - Ensured roles like `TenantAdmin` or `ComplianceOfficer` can no longer escalate privileges to gain sensitive permissions like `PLATFORM_ADMIN_IMPERSONATE_TENANT`.
  - Added new regression test suite `src/core/tests/rbac-privilege-escalation.test.ts` to prove correct RBAC mapping and lack of escalation under concurrent or unauthorized sessions.
  - Adjusted legacy tests in `src/core/tests/rbac.test.ts` to reflect the new strict permissions-matching design.

- **[P0-4] Hardcoded Database Password Removal and Rotation (`0008_force_row_level_security.up.sql`):**
  - Completely removed the hardcoded password `ErpAppSecurePass2026!` from the SQL migration `0008_force_row_level_security.up.sql`, replacing it with a secure runtime placeholder `$APP_DB_PASSWORD$`.
  - Upgraded the database migration engine (`src/core/database/migrations.ts`) to dynamically inject and replace the password placeholder with the highly secure operational database password configured in the environment variables at execution time.
  - Rotated the active operational password in `.env` to a secure 32-character high-entropy value.
  - Cleaned `.env.example` to feature clean instructions and placeholders rather than any hardcoded credentials.
  - Added a new regression test suite `src/core/tests/database-password-security.test.ts` to enforce that no SQL migration contains hardcoded secrets and verify safe dynamic injection behavior.
