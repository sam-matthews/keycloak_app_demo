# Passkey Realm Setup Guide

This guide explains how to create and configure a development realm specifically for passkey experimentation.

## Overview

The `dev-passkeys` realm is isolated from the main `demo-realm` to allow safe experimentation with passkey authentication without affecting the main application.

## Prerequisites

- Docker and Docker Compose installed
- Keycloak container running (`docker-compose up -d keycloak`)

## Quick Start

### 1. Start Keycloak

```bash
docker-compose up -d keycloak
```

Wait for Keycloak to be fully ready (about 30 seconds).

### 2. Run the Setup Script

```bash
# Using docker-compose
docker-compose run --rm keycloak-setup node /app/scripts/setup-passkey-realm.js

# Or using Node.js directly (if you have Node 18+ installed)
KEYCLOAK_URL=http://localhost:8080 \
KEYCLOAK_ADMIN=admin \
KEYCLOAK_ADMIN_PASSWORD=admin123 \
node scripts/setup-passkey-realm.js
```

### 3. Verify the Realm

The script will:
- ✅ Create the `dev-passkeys` realm
- ✅ Set it to `Enabled`
- ✅ Configure default login theme (`keycloak`)
- ✅ Verify the realm is accessible

## Realm Configuration

| Setting | Value |
|---------|-------|
| Realm Name | `dev-passkeys` |
| Display Name | Development Passkeys Realm |
| Enabled | `true` |
| Login Theme | `keycloak` (default) |
| Registration Allowed | `true` |
| SSL Required | `none` (development only) |

## Accessing the Realm

### Admin Console
```
http://localhost:8080/admin/master/console/#/dev-passkeys
```

Login with:
- Username: `admin`
- Password: `admin123`

### Realm Login Page
```
http://localhost:8080/realms/dev-passkeys/account
```

### Realm OpenID Configuration
```
http://localhost:8080/realms/dev-passkeys/.well-known/openid-configuration
```

## Next Steps

### Configure Passkey Authentication

1. Go to Admin Console → Authentication
2. Create a new authentication flow for passkeys
3. Add the WebAuthn authenticator
4. Configure browser flow to use passkeys

### Create Test Users

1. Navigate to Realm Settings → Users
2. Click "Add user"
3. Set username and email
4. Save and set password in Credentials tab
5. Register passkey via Account Console

### Create a Client Application

1. Go to Clients → Create client
2. Set Client ID (e.g., `passkey-test-app`)
3. Enable Standard Flow and Direct Access Grants
4. Configure redirect URIs
5. Save and test authentication

## Verification Checklist

- [ ] Realm `dev-passkeys` exists in Keycloak
- [ ] Realm is set to Enabled
- [ ] Login theme is set to default (`keycloak`)
- [ ] Admin console loads without errors
- [ ] Can access realm login page
- [ ] OpenID configuration endpoint is accessible

## Troubleshooting

### Script Fails with Connection Error

**Problem:** Cannot connect to Keycloak

**Solution:**
```bash
# Ensure Keycloak is running
docker-compose ps keycloak

# Check Keycloak logs
docker-compose logs keycloak

# Restart Keycloak if needed
docker-compose restart keycloak
```

### Realm Already Exists

**Problem:** Script reports realm already exists

**Solution:**
The script is idempotent. If the realm already exists, it will verify the configuration without making changes.

To recreate the realm:
1. Delete it via Admin Console
2. Re-run the script

### Admin Authentication Fails

**Problem:** Cannot authenticate as admin

**Solution:**
Verify admin credentials in `docker-compose.yml`:
```yaml
KEYCLOAK_ADMIN: admin
KEYCLOAK_ADMIN_PASSWORD: admin123
```

## Cleaning Up

To remove the test realm:

1. **Via Admin Console:**
   - Navigate to Realm Settings
   - Click "Delete" button
   - Confirm deletion

2. **Via REST API:**
   ```bash
   # Get admin token
   TOKEN=$(curl -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
     -d "client_id=admin-cli" \
     -d "username=admin" \
     -d "password=admin123" \
     -d "grant_type=password" | jq -r '.access_token')

   # Delete realm
   curl -X DELETE http://localhost:8080/admin/realms/dev-passkeys \
     -H "Authorization: Bearer $TOKEN"
   ```

## References

- [Keycloak WebAuthn Documentation](https://www.keycloak.org/docs/latest/server_admin/#webauthn)
- [W3C WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)
