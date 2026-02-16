# Automated Keycloak Setup

This guide explains how to use the automated Keycloak setup script to quickly configure your demo environment.

## What The Script Does

The `setup-keycloak.js` script uses Keycloak's Admin REST API to automatically:

1. ✅ Wait for Keycloak to be fully ready
2. ✅ Authenticate with Keycloak admin credentials
3. ✅ Create the `demo-realm` with security settings
4. ✅ Create the `web-app` client with OAuth/OIDC configuration
5. ✅ Generate and display the client secret
6. ✅ Create test users with passwords (non-temporary)

## Quick Usage

### Method 1: Using npm (Recommended)

```bash
# Start services first
docker-compose up -d

# Wait a few seconds for Keycloak to start, then run:
npm run setup-keycloak
```

### Method 2: Using Docker Compose

```bash
# Start services
docker-compose up -d

# Run setup via Docker
docker-compose run --rm keycloak-setup
```

If the script prints a URL with `http://keycloak:8080`, that hostname is only reachable from inside Docker. Use `http://localhost:8080` in your browser.

### Method 3: Direct Execution

```bash
# Make sure Keycloak is running
docker-compose up -d keycloak

# Run the script directly
node scripts/setup-keycloak.js
```

## Environment Variables

The script uses these environment variables (with defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server URL |
| `KEYCLOAK_ADMIN` | `admin` | Admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin123` | Admin password |
| `KEYCLOAK_REALM` | `demo-realm` | Realm name to create |
| `KEYCLOAK_CLIENT_ID` | `web-app` | Client ID to create |

### Custom Configuration Example

```bash
# Using custom environment variables
KEYCLOAK_REALM=my-realm \
KEYCLOAK_CLIENT_ID=my-client \
npm run setup-keycloak
```

## What Gets Created

### Realm: `demo-realm`

- **Display Name**: Demo Realm
- **Registration**: Disabled (users created manually)
- **Login with Email**: Enabled
- **Reset Password**: Enabled
- **Brute Force Protection**: Enabled
- **SSL Requirement**: None (development mode)

### Client: `web-app`

- **Protocol**: OpenID Connect
- **Access Type**: Confidential (requires client secret)
- **Standard Flow**: Enabled (Authorization Code Flow)
- **Direct Access Grants**: Enabled
- **PKCE**: S256 (enforced)
- **Valid Redirect URIs**: `http://localhost:3000/*`
- **Web Origins**: `http://localhost:3000`

### Test Users

Three users are created by default:

| Username | Password | Email | Full Name |
|----------|----------|-------|-----------|
| `testuser` | `password123` | testuser@example.com | Test User |
| `demo` | `demo123` | demo@example.com | Demo Account |
| `alice` | `alice123` | alice@example.com | Alice Smith |

All users have:
- ✅ Email verified
- ✅ Account enabled
- ✅ Non-temporary passwords

## After Running the Script

### 1. Copy the Client Secret

The script will display output like:

```
📋 IMPORTANT: Save this client secret!
Client Secret: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Update your docker-compose.yml backend environment:
KEYCLOAK_CLIENT_SECRET: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 2. Update Backend Configuration

Edit `docker-compose.yml` and replace the placeholder:

```yaml
backend:
  environment:
    KEYCLOAK_CLIENT_SECRET: a1b2c3d4-e5f6-7890-abcd-ef1234567890  # Paste your secret here
```

### 3. Restart Backend Service

```bash
docker-compose restart backend
```

### 4. Access the Application

- **Frontend**: <http://localhost:3000>
- **Keycloak Admin**: <http://localhost:8080>
- **Backend API**: <http://localhost:3001>

Login with any of the test user credentials!

## Troubleshooting

### "Keycloak failed to become ready in time"

**Solution**: Keycloak is still starting. Wait a minute and try again.

```bash
# Check if Keycloak is ready
docker-compose logs keycloak | grep "Listening on"

# Or check health endpoint
curl http://localhost:8080/health/ready
```

### "Admin authentication failed"

**Causes**:
- Keycloak admin credentials are incorrect
- Keycloak is not fully initialized

**Solution**:
```bash
# Verify admin credentials in docker-compose.yml
docker-compose exec keycloak env | grep KEYCLOAK_ADMIN

# Restart Keycloak if needed
docker-compose restart keycloak
```

### "Realm already exists"

This is normal! The script will skip creating the realm and continue with other setup steps.

### "Client already exists"

This is normal! The script will skip creating the client. If you need to retrieve the secret:

1. Access Keycloak Admin Console
2. Go to Clients → web-app → Credentials tab
3. Copy the Client Secret

### "User already exists"

This is normal! The script will skip creating users that already exist.

## Re-running the Script

The script is **idempotent** - it's safe to run multiple times. It will:
- Skip items that already exist
- Only create what's missing
- Display the current client secret if the client exists

## Customizing Users

To create different users, edit `scripts/setup-keycloak.js`:

```javascript
const users = [
  {
    username: 'myuser',
    email: 'myuser@company.com',
    firstName: 'My',
    lastName: 'User',
    password: 'secure-password-123',
  },
  // Add more users here...
];
```

## Advanced: Using in CI/CD

The script can be used in automated deployment pipelines:

```bash
#!/bin/bash
set -e

# Start services
docker-compose up -d

# Wait for services to be healthy
docker-compose exec -T keycloak curl -f http://localhost:8080/health/ready

# Run setup
npm run setup-keycloak

# Extract client secret and inject into deployment
# (Implementation depends on your CI/CD platform)
```

## Security Notes

⚠️ **For Development Only**

The default configuration is for **development purposes only**. Before production:

- [ ] Use strong admin passwords
- [ ] Enable SSL/TLS (set `sslRequired: 'external'` or `'all'`)
- [ ] Use environment-specific secrets management
- [ ] Configure proper password policies
- [ ] Enable email verification
- [ ] Set up MFA/2FA
- [ ] Review and adjust token lifespans
- [ ] Implement proper session management
- [ ] Use strong, randomly generated client secrets

## Script Source Code

The script is located at [`scripts/setup-keycloak.js`](../scripts/setup-keycloak.js) and uses only Node.js built-in modules (no external dependencies).

## API Documentation

For more details on the Keycloak Admin API used by this script:
- [Keycloak Admin REST API Documentation](https://www.keycloak.org/docs-api/latest/rest-api/index.html)
