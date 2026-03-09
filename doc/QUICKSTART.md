# Quick Start Guide

Get the Keycloak demo app running in less than 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ Port 3000, 3001, and 8080 available

## Step 1: Get the Code

```bash
git clone <your-repo-url>
cd keycloak_app_demo
```

## Step 2: Start Services

```bash
docker-compose up -d
```

Wait about 30-60 seconds for all services to initialize.

## Step 3: Run Automated Setup

```bash
npm run setup-keycloak
```

You'll see output like this:

```
╔════════════════════════════════════════════╗
║   Keycloak Automated Setup Script         ║
╚════════════════════════════════════════════╝

Keycloak URL: http://localhost:8080
Realm: demo-realm
Client: web-app

🔍 Waiting for Keycloak to be ready...
✓ Keycloak is ready!

🔐 Authenticating as admin...
✓ Admin authentication successful

🏗️  Creating realm: demo-realm...
✓ Realm 'demo-realm' created successfully

🔧 Creating client: web-app...
✓ Client 'web-app' created successfully

📋 IMPORTANT: Save this client secret!
Client Secret: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Update your docker-compose.yml backend environment:
KEYCLOAK_CLIENT_SECRET: a1b2c3d4-e5f6-7890-abcd-ef1234567890

👥 Creating test users...

👤 Creating user: testuser...
✓ User 'testuser' created successfully
  Email: testuser@example.com
  Password: password123

👤 Creating user: demo...
✓ User 'demo' created successfully
  Email: demo@example.com
  Password: demo123

👤 Creating user: alice...
✓ User 'alice' created successfully
  Email: alice@example.com
  Password: alice123

╔════════════════════════════════════════════╗
║        Setup Completed Successfully!       ║
╚════════════════════════════════════════════╝

📝 Summary:
✓ Realm: demo-realm
✓ Client: web-app
✓ Users created: 3

🔑 Test User Credentials:
  • testuser / password123
  • demo / demo123
  • alice / alice123

⚠️  Action Required:
Update docker-compose.yml with the client secret shown above
Then restart the backend: docker-compose restart backend

🎉 You can now access the application:
   Frontend: http://localhost:3000
   Keycloak: http://localhost:8080
   Backend API: http://localhost:3001
```

## Step 4: Update Client Secret

1. Copy the client secret from the output above
2. Edit `docker-compose.yml`
3. Find the backend service environment section
4. Replace `your-client-secret-here` with your actual secret:

```yaml
backend:
  environment:
    KEYCLOAK_CLIENT_SECRET: a1b2c3d4-e5f6-7890-abcd-ef1234567890  # Your secret here
```

5. Save the file

## Step 5: Restart Backend

```bash
docker-compose restart backend
```

## Step 6: Access the App

Open your browser and go to: **http://localhost:3000**

1. Click **"Login with Keycloak"**
2. Login with any test user:
   - Username: `testuser`
   - Password: `password123`
3. Start creating notes!

## Verify Everything Works

### Test the Frontend
- ✅ Login page loads
- ✅ Keycloak login redirects properly
- ✅ After login, you see the notes interface
- ✅ Can create a new note
- ✅ Can edit a note
- ✅ Can delete a note
- ✅ Logout works

### Check Backend API
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"OK","timestamp":"..."}
```

### Check Keycloak Admin
1. Go to http://localhost:8080
2. Click "Administration Console"
3. Login: `admin` / `admin123`
4. Verify `demo-realm` exists
5. Check Users section shows 3 users

## Troubleshooting

### "Keycloak is not ready"
Wait 1-2 minutes and try again. Keycloak takes time to initialize on first run.

```bash
# Check if Keycloak is running
docker-compose ps keycloak

# View Keycloak logs
docker-compose logs keycloak
```

### "Cannot connect to backend"
Ensure the client secret was updated:

```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### "Port already in use"
Stop conflicting services:

```bash
# macOS/Linux: Check what's using port 8080
lsof -i :8080

# Stop all services and try again
docker-compose down
docker-compose up -d
```

## Next Steps

- 📖 Read the full [README.md](README.md) for detailed features
- 🔧 Explore the [Backend API](README.md#api-endpoints)
- 🎨 Check out the [Frontend Components](frontend/src/components/)
- 🔐 Learn about [Keycloak Configuration](KEYCLOAK_SETUP.md)
- 🤖 Review [Automated Setup Details](AUTOMATED_SETUP.md)

## Common Commands

```bash
# View all logs
npm run logs

# View specific service logs
npm run logs:backend
npm run logs:frontend
npm run logs:keycloak

# Restart all services
npm restart

# Stop all services
npm stop

# Start services
npm start

# Re-run Keycloak setup
npm run setup-keycloak
```

## Development Mode

To work on the code locally:

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Or use the helper script
npm run install:all
```

Then you can run the services individually or use Docker Compose with the existing configuration.

---

**🎉 Congratulations!** Your Keycloak demo app is now running!

Need help? Check the [Troubleshooting Guide](README.md#troubleshooting) or [open an issue](https://github.com/yourusername/keycloak_app_demo/issues).
