#!/usr/bin/env node

/**
 * Keycloak Setup Script
 * 
 * This script automates the complete Keycloak configuration:
 * - Creates the demo-realm
 * - Creates the web-app client with proper settings
 * - Creates test users with passwords
 * - Configures all necessary settings
 */

const https = require('https');
const http = require('http');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_ADMIN = process.env.KEYCLOAK_ADMIN || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin123';
const REALM_NAME = process.env.KEYCLOAK_REALM || 'demo-realm';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'web-app';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getHostKeycloakBaseUrl() {
  try {
    const urlObj = new URL(KEYCLOAK_URL);
    if (urlObj.hostname === 'keycloak') {
      urlObj.hostname = 'localhost';
      return urlObj.toString().replace(/\/$/, '');
    }
  } catch (error) {
    return null;
  }
  return null;
}

function getHostAdminConsoleUrl() {
  const hostKeycloakBaseUrl = getHostKeycloakBaseUrl();
  if (!hostKeycloakBaseUrl) {
    return null;
  }
  return `${hostKeycloakBaseUrl}/admin/master/console/#/${REALM_NAME}`;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({
              statusCode: res.statusCode,
              data: data ? JSON.parse(data) : null,
              headers: res.headers,
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              data: data,
              headers: res.headers,
            });
          }
        } else {
          reject({
            statusCode: res.statusCode,
            message: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }

    req.end();
  });
}

async function waitForKeycloak() {
  log('\n🔍 Waiting for Keycloak to be ready...', 'yellow');
  const maxAttempts = 30;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      // Check if Keycloak master realm is accessible (more reliable than health endpoint)
      await makeRequest(`${KEYCLOAK_URL}/realms/master`);
      log('✓ Keycloak is ready!', 'green');
      return true;
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        throw new Error('Keycloak failed to become ready in time');
      }
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function getAdminToken() {
  log('\n🔐 Authenticating as admin...', 'yellow');
  
  const params = new URLSearchParams({
    username: KEYCLOAK_ADMIN,
    password: KEYCLOAK_ADMIN_PASSWORD,
    grant_type: 'password',
    client_id: 'admin-cli',
  });

  try {
    const response = await makeRequest(
      `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    log('✓ Admin authentication successful', 'green');
    return response.data.access_token;
  } catch (error) {
    log(`✗ Admin authentication failed: ${error.message}`, 'red');
    throw error;
  }
}

async function createRealm(token) {
  log(`\n🏗️  Creating realm: ${REALM_NAME}...`, 'yellow');

  const realmConfig = {
    realm: REALM_NAME,
    enabled: true,
    displayName: 'Demo Realm',
    registrationAllowed: false,
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
    editUsernameAllowed: false,
    bruteForceProtected: true,
    sslRequired: 'none', // For development; use 'external' or 'all' in production
  };

  try {
    await makeRequest(`${KEYCLOAK_URL}/admin/realms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: realmConfig,
    });
    log(`✓ Realm '${REALM_NAME}' created successfully`, 'green');
    return true;
  } catch (error) {
    if (error.statusCode === 409) {
      log(`ℹ Realm '${REALM_NAME}' already exists`, 'cyan');
      return false;
    }
    log(`✗ Failed to create realm: ${error.message}`, 'red');
    throw error;
  }
}

async function createClient(token) {
  log(`\n🔧 Creating client: ${CLIENT_ID}...`, 'yellow');

  // macOS OIDC client config
  let clientConfig;
  if (CLIENT_ID === 'macos-app') {
    clientConfig = {
      clientId: CLIENT_ID,
      name: 'macOS App',
      description: 'OIDC client for macOS app',
      enabled: true,
      protocol: 'openid-connect',
      publicClient: true, // No client secret, public client
      standardFlowEnabled: true, // Authorization Code Flow
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      authorizationServicesEnabled: false,
      redirectUris: [
        'myapp://auth/callback',
        'http://localhost/*',
      ],
      webOrigins: [],
      attributes: {
        'pkce.code.challenge.method': 'S256',
        'post.logout.redirect.uris': 'myapp://auth/callback http://localhost/*',
      },
    };
  } else {
    // Default (web-app)
    clientConfig = {
      clientId: CLIENT_ID,
      name: 'Web Application',
      description: 'React frontend application',
      enabled: true,
      protocol: 'openid-connect',
      publicClient: true,  // Browser apps must be public clients
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: false,
      authorizationServicesEnabled: false,
      redirectUris: ['http://localhost:3000/*'],
      webOrigins: ['http://localhost:3000'],
      attributes: {
        'pkce.code.challenge.method': 'S256',
        'post.logout.redirect.uris': 'http://localhost:3000/*',
      },
    };
  }

  try {
    const response = await makeRequest(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: clientConfig,
      }
    );

    log(`✓ Client '${CLIENT_ID}' created successfully`, 'green');
    log(`ℹ Client is configured as a public client with PKCE (no secret needed)`, 'cyan');
    return null;
  } catch (error) {
    if (error.statusCode === 409) {
      log(`ℹ Client '${CLIENT_ID}' already exists`, 'cyan');
      return null;
    }
    log(`✗ Failed to create client: ${error.message}`, 'red');
    throw error;
  }
}

async function createUser(token, username, email, firstName, lastName, password) {
  log(`\n👤 Creating user: ${username}...`, 'yellow');

  const userConfig = {
    username: username,
    email: email,
    firstName: firstName,
    lastName: lastName,
    enabled: true,
    emailVerified: true,
    credentials: [
      {
        type: 'password',
        value: password,
        temporary: false,
      },
    ],
  };

  try {
    await makeRequest(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: userConfig,
      }
    );
    log(`✓ User '${username}' created successfully`, 'green');
    log(`  Email: ${email}`, 'cyan');
    log(`  Password: ${password}`, 'cyan');
    return true;
  } catch (error) {
    if (error.statusCode === 409) {
      log(`ℹ User '${username}' already exists`, 'cyan');
      return false;
    }
    log(`✗ Failed to create user: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  try {
    log('╔════════════════════════════════════════════╗', 'blue');
    log('║   Keycloak Automated Setup Script         ║', 'blue');
    log('╚════════════════════════════════════════════╝', 'blue');
    
    log(`\nKeycloak URL: ${KEYCLOAK_URL}`, 'cyan');
    log(`Realm: ${REALM_NAME}`, 'cyan');
    log(`Client: ${CLIENT_ID}`, 'cyan');

    // Step 1: Wait for Keycloak
    await waitForKeycloak();

    // Step 2: Get admin token
    const token = await getAdminToken();

    // Step 3: Create realm
    await createRealm(token);

    // Step 4: Create client
    const clientSecret = await createClient(token);

    // Step 5: Create test users
    log('\n👥 Creating test users...', 'yellow');
    
    const users = [
      {
        username: 'testuser',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      },
      {
        username: 'demo',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'Account',
        password: 'demo123',
      },
      {
        username: 'alice',
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        password: 'alice123',
      },
    ];

    for (const user of users) {
      await createUser(
        token,
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        user.password
      );
    }

    // Summary
    log('\n╔════════════════════════════════════════════╗', 'green');
    log('║        Setup Completed Successfully!       ║', 'green');
    log('╚════════════════════════════════════════════╝', 'green');

    log('\n📝 Summary:', 'yellow');
    log(`✓ Realm: ${REALM_NAME}`, 'green');
    log(`✓ Client: ${CLIENT_ID}`, 'green');
    log(`✓ Users created: ${users.length}`, 'green');

    log('\n🔑 Test User Credentials:', 'yellow');
    users.forEach(user => {
      log(`  • ${user.username} / ${user.password}`, 'cyan');
    });

    if (clientSecret) {
      log('\n⚠️  Action Required:', 'yellow');
      log('Update docker-compose.yml with the client secret shown above', 'yellow');
      log('Then restart the backend: docker-compose restart backend', 'yellow');
    }

    log('\n🎉 You can now access the application:', 'green');
    log('   Frontend: http://localhost:3000', 'cyan');
    log('   Keycloak: http://localhost:8080', 'cyan');
    const hostKeycloakBaseUrl = getHostKeycloakBaseUrl();
    if (hostKeycloakBaseUrl) {
      log(`   Keycloak (host): ${hostKeycloakBaseUrl}`, 'yellow');
    }
    log('   Backend API: http://localhost:3001', 'cyan');

    log('\n🔗 Admin Console:', 'yellow');
    log(`   ${KEYCLOAK_URL}/admin/master/console/#/${REALM_NAME}`, 'cyan');
    const hostAdminConsoleUrl = getHostAdminConsoleUrl();
    if (hostAdminConsoleUrl) {
      log(`   (Host): ${hostAdminConsoleUrl}`, 'yellow');
    }

  } catch (error) {
    log('\n✗ Setup failed:', 'red');
    log(error.message || error, 'red');
    if (error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  }
}

// Handle SIGINT
process.on('SIGINT', () => {
  log('\n\n⚠️  Setup interrupted by user', 'yellow');
  process.exit(0);
});

// Run the script
main();
