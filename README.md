# Keycloak Demo App - Notes Application

A full-stack note-taking application demonstrating Keycloak authentication integration with a React frontend and Node.js backend, using PostgreSQL for data persistence.

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
```

## Documentation

- � **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- �📘 **[Automated Setup Guide](AUTOMATED_SETUP.md)** - Complete guide for automated Keycloak setup
- 📗 **[Manual Setup Guide](KEYCLOAK_SETUP.md)** - Step-by-step manual configuration
- 📄 **[Project Guidelines](.github/copilot-instructions.md)** - Development best practices

## Development

### Local Development Setup

#### Backend

\`\`\`bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
\`\`\`

#### Frontend

\`\`\`bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
\`\`\`

### Environment Variables

See `.env.example` files in both `backend/` and `frontend/` directories for all available configuration options.

### Database Migrations

The database schema is automatically initialized on first run. To manually initialize:

\`\`\`bash
docker-compose exec backend node -e "require('./database').init()"
\`\`\`

## Project Structure

\`\`\`
keycloak_app_demo/
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
└── docker-compose.yml           # Service orchestration

\`\`\`

## API Endpoints

### Notes API

All endpoints require a valid JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

#### GET /api/notes
Fetch all notes for the authenticated user.

**Response:**
\`\`\`json
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
\`\`\`

#### POST /api/notes
Create a new note.

**Request:**
\`\`\`json
{
  "title": "My Note",
  "content": "Note content"
}
\`\`\`

#### PUT /api/notes/:id
Update an existing note.

**Request:**
\`\`\`json
{
  "title": "Updated Title",
  "content": "Updated content"
}
\`\`\`

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
\`\`\`bash
lsof -i :8080
\`\`\`

Wait for Keycloak health check to pass:
\`\`\`bash
docker-compose logs -f keycloak
\`\`\`

### Backend Cannot Connect to Database

Ensure app-db is healthy:
\`\`\`bash
docker-compose ps
docker-compose logs app-db
\`\`\`

### Frontend Cannot Connect to Backend

Check CORS configuration in `backend/server.js` and ensure REACT_APP_API_URL is correct.

### Token Validation Errors

Verify:
1. Keycloak realm and client configuration match environment variables
2. Client secret is correct in backend configuration
3. Token hasn't expired (Keycloak tokens expire after 5 minutes by default)

## Production Deployment

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
