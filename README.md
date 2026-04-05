# Keycloak Demo App - Notes Application

A full-stack note-taking application demonstrating Keycloak authentication integration with a React frontend and Node.js backend, using PostgreSQL for data persistence.

Just another line.

## Architecture

This application follows microservices best practices with containerized services:

- **Frontend**: React 18 application with Keycloak authentication
- **Backend**: Node.js/Express REST API with JWT validation
- **App Database**: PostgreSQL 15 for application data
- **Keycloak**: Authentication and authorization server
- **Keycloak Database**: PostgreSQL 15 for Keycloak data

## Features

- ✅ User authentication via Keycloak SSO
- ✅ **Automated Keycloak setup** with ready-to-use test users
- ✅ JWT token-based API security
- ✅ CRUD operations for notes (user-scoped)
- ✅ Automatic token refresh
- ✅ Role-based access control support
- ✅ Containerized microservices architecture
- ✅ PostgreSQL database with connection pooling
- ✅ Security best practices (Helmet, CORS, input validation)

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

## Quick Start

### Option 1: Automated Setup (Recommended)

The fastest way to get started is using the automated setup script:

```bash
# 1. Clone and navigate to the repository
git clone <repository-url>
cd keycloak_app_demo

# 2. Start all services
docker-compose up -d

# 3. Run the automated Keycloak setup
npm run setup-keycloak
```

The script will automatically:
- ✅ Wait for Keycloak to be ready
- ✅ Create the `demo-realm`
- ✅ Create the `web-app` client
- ✅ Generate and display the client secret
- ✅ Create 3 test users with passwords

**Test User Credentials:**
- `testuser` / `password123`
- `demo` / `demo123`
- `alice` / `alice123`

After the script completes:
1. Copy the displayed client secret
2. Update `docker-compose.yml` backend environment: `KEYCLOAK_CLIENT_SECRET`
3. Restart backend: `docker-compose restart backend`
4. Access the app at <http://localhost:3000>

**Alternative: Run setup via Docker**
```bash
docker-compose run --rm keycloak-setup
```

### Option 2: Manual Setup

If you prefer manual configuration, follow the detailed steps in [KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md).

## Available Scripts

Once services are running, you can use these npm scripts:

```bash
npm run setup-keycloak    # Run Keycloak automated setup
npm start                   # Start all services (docker-compose up -d)
npm stop                    # Stop all services (docker-compose down)
npm restart                 # Restart all services
npm run logs                # View logs for all services
npm run logs:backend        # View backend logs only
npm run logs:frontend       # View frontend logs only
npm run logs:keycloak       # View Keycloak logs only
npm run lockfiles:sync      # Regenerate lockfiles with Node 20 + verify npm ci
npm run lockfiles:check     # CI-style npm ci validation only (no lockfile changes)
npm run security:images:age # Enforce 14-day minimum age for configured container tags
```

## Automatic Dependency Updates

This repository now includes automated dependency updates via Dependabot:

- Docker images in `docker-compose.yml` and Dockerfiles (`.github/dependabot.yml`)
- Backend npm packages (`/backend/package.json`)
- Frontend npm packages (`/frontend/package.json`)
- GitHub Actions workflow versions

Dependabot opens weekly PRs with version bumps so updates are reviewed and merged safely instead of drifting over time.

To enable this in GitHub:

1. Push this branch to your GitHub repository.
2. Ensure Dependabot is enabled in repository settings.
3. Review and merge generated PRs each week.

### Blocking Known-Bad Versions

Known malicious or compromised package versions can be blocked centrally:

- Policy file: `.github/security/blocked-packages.json`
- Checker script: `scripts/verify-dependencies.js`
- CI workflow: `.github/workflows/dependency-guard.yml`

If a blocked version appears in `backend/package-lock.json` or `frontend/package-lock.json`, CI fails.

To block a newly identified bad release, add it to `.github/security/blocked-packages.json`.

### Minimum Release Age Gate

To reduce supply-chain risk from freshly published packages, this repository enforces a minimum package age before adoption.

- Policy file: `.github/security/dependency-age-policy.json`
- Default: `minimumReleaseAgeDays = 14`
- Default: `includeTransitiveDependencies = true`
- Enforcement: `scripts/verify-dependencies.js` in CI

If a direct or transitive dependency version is newer than the configured age, CI fails.

You can tune this approach by:

1. Setting `minimumReleaseAgeDays` to `14` or `30`.
2. Setting `includeTransitiveDependencies` to `true` or `false` based on strictness needs.
3. Adding temporary emergency exceptions under `allowFreshVersions`.

## Image Age Policy In CI

This repository enforces image release-age policy in the pipeline via `.github/workflows/security-scan.yml`.

It also enforces a container image age gate:

- Policy file: `.github/security/image-policy.json`
- Default: `minimumImageAgeDays = 14`
- Source of image tags: tracked services in `docker-compose.yml`
- Enforcement: `scripts/verify-images.js` in CI

Configured service images are read from `docker-compose.yml` (`keycloak-db`, `app-db`, and `reverse-proxy` by default), so image tag changes only need to be made in one place.

You can run the same check locally:

```bash
npm run security:images:age
```

## Additional Supply Chain Controls

The CI setup now includes additional protections:

- Action pinning by commit SHA in workflow files under `.github/workflows/`
- CodeQL static analysis in `.github/workflows/codeql.yml`

## Documentation

- [Quick Start Guide](doc/QUICKSTART.md) - Get running in 5 minutes
- [Automated Setup Guide](doc/AUTOMATED_SETUP.md) - Complete guide for automated Keycloak setup
- [Manual Setup Guide](doc/KEYCLOAK_SETUP.md) - Step-by-step manual configuration
- [Project Guidelines](.github/copilot-instructions.md) - Development best practices

## Development

### Local Development Setup

#### Backend

```
keycloak_app_demo/
├── .github/
│   └── copilot-instructions.md
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT validation middleware
│   │   └── routes/
│   │       └── notes.js         # Notes CRUD endpoints
│   ├── database.js              # PostgreSQL connection & queries
│   ├── server.js                # Express server setup
│   ├── package.json
│   └── Dockerfile
├── doc/
│   ├── AUTOMATED_SETUP.md
│   ├── KEYCLOAK_SETUP.md
│   └── QUICKSTART.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NotesList.js     # Notes display component
│   │   │   └── NoteForm.js      # Note create/edit form
│   │   ├── contexts/
│   │   │   └── AuthContext.js   # Auth state management
│   │   ├── services/
│   │   │   ├── keycloak.js      # Keycloak integration
│   │   │   └── noteService.js   # API client
│   │   ├── App.js               # Main app component
│   │   └── index.js             # React entry point
│   ├── public/
│   │   ├── index.html
│   │   └── silent-check-sso.html
│   ├── package.json
│   └── Dockerfile
├── reverse-proxy/
│   ├── includes/
│   └── nginx.conf
├── scripts/
│   ├── fix-client.js
│   └── setup-keycloak.js
├── docker-compose.yml           # Service orchestration
└── package.json
```

## API Endpoints

### Notes API

All endpoints require a valid JWT token in the Authorization header:

``` bash
Authorization: Bearer <token>
```

#### GET /api/notes
Fetch all notes for the authenticated user.

**Response:**
``` json
[
  {
    "id": 1,
    "user_id": "user-uuid",
    "user_email": "user@example.com",
    "title": "My Note",
    "content": "Note content",
    "created_at": "2026-02-11T10:00:00Z",
    "updated_at": "2026-02-11T10:00:00Z"
  }
]
```

#### POST /api/notes
Create a new note.

**Request:**
``` json
{
  "title": "My Note",
  "content": "Note content"
}
```

#### PUT /api/notes/:id
Update an existing note.

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### DELETE /api/notes/:id
Delete a note.

## Security Features

- **HTTPS Ready**: Configure SSL/TLS for production
- **CORS**: Configured with specific origins
- **Helmet**: Security headers middleware
- **Input Validation**: All user inputs validated
- **Parameterized Queries**: SQL injection prevention
- **JWT Validation**: Token signature and expiry verification
- **PKCE**: Proof Key for Code Exchange enabled
- **Role-Based Access**: Infrastructure ready for role checks

## Troubleshooting

### Keycloak Not Starting

Check if port 8080 is available:
```bash
lsof -i :8080
```

Wait for Keycloak health check to pass:
```bash
docker-compose logs -f keycloak
```

### Backend Cannot Connect to Database

Ensure app-db is healthy:
```bash
docker-compose ps
docker-compose logs app-db
``` 

### Frontend Cannot Connect to Backend

Check CORS configuration in `backend/server.js` and ensure REACT_APP_API_URL is correct.

### Token Validation Errors

Verify:
1. Keycloak realm and client configuration match environment variables
2. Client secret is correct in backend configuration
3. Token hasn't expired (Keycloak tokens expire after 5 minutes by default)

## Production Deployment

### VM + DNS + TLS (Subdomain Routing)

This repository now includes a reverse proxy service for VM deployments:

- `app.sammatthews.nz` -> frontend
- `api.sammatthews.nz` -> backend
- `auth.sammatthews.nz` -> Keycloak

Traefik handles host-based routing and automatically provisions Let's Encrypt certificates.

1. Create DNS `A` records for `app`, `api`, and `auth` subdomains to your VM public IP.
2. Copy `.env.example` to `.env` and set at minimum:
  - `ACME_EMAIL`
  - `KEYCLOAK_HOSTNAME` (hostname only, e.g. `auth.sammatthews.nz`)
  - `KEYCLOAK_PUBLIC_URL` (full URL, e.g. `https://auth.sammatthews.nz`)
  - `REACT_APP_API_URL`
  - `REACT_APP_KEYCLOAK_URL`
  - `APP_CORS_ORIGINS`
3. Start services:

```bash
docker-compose up -d
```

4. Validate endpoints:
  - `https://app.sammatthews.nz`
  - `https://api.sammatthews.nz/api/health`
  - `https://auth.sammatthews.nz`

Notes:
- App containers still publish localhost-only ports for local diagnostics.
- Public internet traffic should go through the reverse proxy on ports 80/443.

### Keycloak Realm Strategy for Multiple Apps

Use one realm for shared SSO users, and create one OIDC client per application.

- Recommended: single realm + multiple clients (`web-app`, `admin-app`, etc.)
- Use client scopes and roles for app-level authorization boundaries
- Use separate realms only for strict isolation (different user directories/policies) or non-production experiments

### CI/CD Deployment To VM

This repository includes a deploy workflow at `.github/workflows/deploy-vm.yml`.
It triggers automatically on pushes to `main` and can also be run manually.

#### Required GitHub Actions Secrets

- `VM_HOST`: VM hostname or IP
- `VM_USER`: deploy user (recommended non-root user, e.g. `deploy`)
- `VM_SSH_KEY`: private SSH key for `VM_USER`
- `VM_PORT`: SSH port (usually `22`)
- `VM_APP_DIR`: deployment directory on VM (example: `/home/deploy/keycloak_app_demo`)

#### VM First-Run Bootstrap

```bash
mkdir -p /home/deploy/keycloak_app_demo
chown -R deploy:deploy /home/deploy/keycloak_app_demo
```

Ensure a production `.env` exists on the VM in `VM_APP_DIR` before the first workflow run.
If `.env` is missing, the deploy script will bootstrap from `.env.prod` when available.

#### What The Workflow Does

1. Copies repository files to the VM over SSH
2. Runs `scripts/deploy-vm.sh` remotely
3. Executes `docker compose up -d --build`
4. Runs idempotent `keycloak-setup`
5. Verifies public health endpoints (`app`, `api`, `auth`)

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong client secrets
- [ ] Enable HTTPS/TLS
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Enable database SSL
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review Keycloak security settings
- [ ] Use secrets management (e.g., Docker secrets, Kubernetes secrets)
- [ ] Set up monitoring and logging

### Docker Production Build

Update Dockerfiles to use multi-stage builds and remove development dependencies.

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
