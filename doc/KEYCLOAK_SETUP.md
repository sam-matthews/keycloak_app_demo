# Keycloak Configuration Guide

This guide walks you through setting up Keycloak for the demo application.

## Step 1: Access Keycloak Admin Console

1. Ensure all services are running:
   ```bash
   docker-compose up -d
   ```

2. Wait for Keycloak to be ready (check health):
   ```bash
   docker-compose logs -f keycloak
   ```
   Look for: "Listening on: http://0.0.0.0:8080"

3. Open your browser and navigate to: <http://localhost:8080>

4. Click **"Administration Console"**

5. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

## Step 2: Create Realm

1. Click the **dropdown menu** in the top-left corner (currently shows "master")

2. Click **"Create Realm"**

3. Enter Realm settings:
   - **Realm name**: `demo-realm`
   - Leave other settings as default

4. Click **"Create"**

You should now see "demo-realm" in the top-left dropdown.

## Step 3: Create Client

1. In the left sidebar, click **"Clients"**

2. Click **"Create client"** button

3. **General Settings**:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `web-app`
   - Click **"Next"**

4. **Capability config**:
   - Toggle **ON**: "Client authentication"
   - Authentication flow: Check ✓ "Standard flow"
   - Authentication flow: Check ✓ "Direct access grants"
   - Click **"Next"**

5. **Login settings**:
   - **Valid redirect URIs**: `http://localhost:3000/*`
   - **Valid post logout redirect URIs**: `http://localhost:3000/*`
   - **Web origins**: `http://localhost:3000`
   - Click **"Save"**

## Step 4: Get Client Secret

1. Click on your **"web-app"** client from the clients list

2. Navigate to the **"Credentials"** tab

3. Copy the **"Client Secret"** value

4. Update the backend configuration:

   **Option A: Update docker-compose.yml**
   ```yaml
   backend:
     environment:
       KEYCLOAK_CLIENT_SECRET: paste-your-secret-here
   ```

   **Option B: Create backend/.env**
   ```env
   KEYCLOAK_CLIENT_SECRET=paste-your-secret-here
   ```

5. Restart the backend service:
   ```bash
   docker-compose restart backend
   ```

## Step 5: Create Test User

1. In the left sidebar, click **"Users"**

2. Click **"Create new user"** button

3. Fill in user details:
   - **Username**: `testuser` (or your choice)
   - **Email**: `testuser@example.com` (optional)
   - **First name**: `Test` (optional)
   - **Last name**: `User` (optional)
   - **Email verified**: Toggle ON (optional)
   - **Enabled**: Should be ON by default

4. Click **"Create"**

5. Go to the **"Credentials"** tab

6. Click **"Set password"**

7. Enter password details:
   - **Password**: `password123` (or your choice)
   - **Password confirmation**: `password123`
   - **Temporary**: Toggle **OFF** (important!)

8. Click **"Save"**

9. Confirm the password reset in the dialog

## Step 6: Test the Application

1. Open your browser and navigate to: <http://localhost:3000>

2. You should see the login page with **"Login with Keycloak"** button

3. Click the button - you'll be redirected to Keycloak login

4. Enter your test user credentials:
   - **Username**: `testuser`
   - **Password**: `password123`

5. After successful login, you'll be redirected back to the app

6. You should now see the notes interface with your username displayed

## Optional: Configure Token Lifespan

By default, Keycloak tokens expire after 5 minutes. To adjust:

1. Go to **"Realm settings"** in the left sidebar

2. Click the **"Tokens"** tab

3. Adjust **"Access Token Lifespan"** (e.g., to 30 minutes)

4. Click **"Save"**

## Optional: Create Roles

To test role-based access control:

1. Go to **"Realm roles"** in the left sidebar

2. Click **"Create role"**

3. Enter role name (e.g., `admin`, `user`)

4. Click **"Save"**

5. Assign role to user:
   - Go to **"Users"**
   - Select your test user
   - Go to **"Role mapping"** tab
   - Click **"Assign role"**
   - Select roles to assign
   - Click **"Assign"**

## Troubleshooting

### Cannot Access Admin Console

- Ensure Keycloak container is running: `docker-compose ps`
- Check Keycloak logs: `docker-compose logs keycloak`
- Verify port 8080 is not in use: `lsof -i :8080` (macOS/Linux)

### Invalid Redirect URI Error

- Ensure Valid redirect URIs includes: `http://localhost:3000/*`
- Check that Web origins includes: `http://localhost:3000`
- Verify the frontend is running on port 3000

### Token Validation Errors

- Ensure KEYCLOAK_CLIENT_SECRET in backend matches the value in Keycloak
- Verify KEYCLOAK_REALM is set to `demo-realm`
- Check that KEYCLOAK_CLIENT_ID is `web-app`
- Restart backend after changing environment variables

### User Login Fails

- Ensure user is **Enabled**
- Ensure password is **not Temporary**
- Check user credentials are correct
- Verify user exists in the correct realm (`demo-realm`)

## Next Steps

- Explore Keycloak's realm settings for additional security options
- Configure email settings for password recovery
- Set up social login providers (Google, GitHub, etc.)
- Configure two-factor authentication
- Review audit logs and events

## Security Notes for Production

⚠️ **IMPORTANT**: The default credentials and settings in this demo are NOT secure for production use.

Before deploying to production:

- [ ] Change admin password to a strong, unique password
- [ ] Use a strong client secret (generate with a password manager)
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure proper password policies
- [ ] Set up email verification
- [ ] Enable brute force detection
- [ ] Configure session timeouts appropriately
- [ ] Review and adjust token lifespans
- [ ] Set up database backups
- [ ] Use environment variables or secrets management for sensitive data
