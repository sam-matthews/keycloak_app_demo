# Configure WebAuthn Passwordless Settings for Localhost

## Goal
Ensure WebAuthn Passwordless works on macOS browsers in local development.

## Scope
Apply Keycloak Realm Settings -> WebAuthn Passwordless values for localhost development and verify they persist.

## Plan
1. Open Keycloak Admin Console at `http://localhost:8080` and sign in with admin credentials.
2. Select the target realm used by local app login.
3. Navigate to `Realm Settings` -> `WebAuthn Passwordless`.
4. Set `Relying Party ID` to `localhost`.
5. Set `Relying Party Name` to `Mac App Dev`.
6. Set `Origin` to `http://localhost:8080`.
7. Set `User Verification Requirement` to `preferred`.
8. Set `Attestation Conveyance Preference` to `none`.
9. Click `Save`.
10. Reload the same settings page and confirm values are unchanged.
11. If any validation error appears, correct value formatting and save again.

## Validation Checklist
- No validation errors are shown after clicking `Save`.
- Reloading `Realm Settings` -> `WebAuthn Passwordless` keeps all configured values.
- Effective values remain:
  - RP ID: `localhost`
  - RP Name: `Mac App Dev`
  - Origin: `http://localhost:8080`
  - User Verification: `preferred`
  - Attestation Conveyance: `none`

## Notes
- Use the exact origin string including protocol and port.
- Keep this as localhost-only development configuration.
- If browser testing still fails, verify the realm/client context and that passkey-related required actions/flows are enabled for users.
