# macOS OIDC Client Setup

This guide explains how to create and configure a Keycloak OIDC client for a macOS app using the automated setup script.

## 1. Prerequisites
- Docker and Docker Compose installed
- Keycloak and database containers running (`docker-compose up -d`)

## 2. Create the macOS OIDC Client

Run the following command to create the `macos-app` OIDC client with PKCE and the correct redirect URIs:

```bash
docker-compose run --rm keycloak-setup-macos
```

This will:
- Create the `macos-app` client in Keycloak (if it doesn't exist)
- Set client type: OpenID Connect, public client (no secret)
- Enable Standard Flow (Authorization Code)
- Enable PKCE (S256)
- Set redirect URIs:
  - `myapp://auth/callback`
  - `http://localhost/*` (for development)
- Disable client authentication and authorization services

## 3. Verify in Keycloak Admin UI

1. Go to [http://localhost:8080](http://localhost:8080) and log in as admin
2. Select the `demo-realm` realm
3. Go to **Clients** and select `macos-app`
4. Confirm these settings:
   - **Client authentication**: Off
   - **Authorization**: Off
   - **Standard flow**: On
   - **PKCE**: S256 (See advanced tab)
   - **Redirect URIs**: `myapp://auth/callback`, `http://localhost/*`
   - **Access Type**: Public

## 4. Use in Your macOS App

- Client ID: `macos-app`
- Realm: `demo-realm`
- Auth server URL: `http://localhost:8080/realms/demo-realm`
- Redirect URI: `myapp://auth/callback`
- PKCE: S256 (required)

## 5. Notes
- You can re-run the setup script safely; it will not duplicate clients.
- For production, review security settings and use HTTPS.

---

For more details, see [doc/AUTOMATED_SETUP.md](AUTOMATED_SETUP.md) and [doc/KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md).
