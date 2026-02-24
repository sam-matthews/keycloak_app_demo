#!/usr/bin/env node

/**
 * Passkey Realm Setup Script
 * 
 * Creates a development realm specifically for passkey experimentation:
 * - Creates the dev-passkeys realm
 * - Sets it to Enabled
 * - Uses default login theme
 */

const https = require('https');
const http = require('http');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_ADMIN = process.env.KEYCLOAK_ADMIN || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin123';
const REALM_NAME = 'dev-passkeys';
const WEBAUTHN_PASSWORDLESS_RP_ID = process.env.WEBAUTHN_PASSWORDLESS_RP_ID || 'localhost';
const WEBAUTHN_PASSWORDLESS_RP_NAME = process.env.WEBAUTHN_PASSWORDLESS_RP_NAME || 'Mac App Dev';
const WEBAUTHN_PASSWORDLESS_ORIGIN = process.env.WEBAUTHN_PASSWORDLESS_ORIGIN || 'http://localhost:8080';
const WEBAUTHN_PASSWORDLESS_USER_VERIFICATION =
  process.env.WEBAUTHN_PASSWORDLESS_USER_VERIFICATION || 'preferred';
const WEBAUTHN_PASSWORDLESS_ATTESTATION =
  process.env.WEBAUTHN_PASSWORDLESS_ATTESTATION || 'none';

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

function getHostAdminConsoleUrl() {
  try {
    const urlObj = new URL(KEYCLOAK_URL);
    if (urlObj.hostname === 'keycloak') {
      urlObj.hostname = 'localhost';
      return `${urlObj.toString().replace(/\/$/, '')}/admin/master/console/#/${REALM_NAME}`;
    }
  } catch (error) {
    return null;
  }
  return null;
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

async function updatePasskeyRealm(token) {
  log(`\n🔧 Updating realm settings: ${REALM_NAME}...`, 'yellow');

  const realmUpdate = {
    enabled: true,
    loginTheme: 'keycloak',
  };

  try {
    await makeRequest(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: realmUpdate,
    });
    log(`✓ Realm '${REALM_NAME}' updated successfully`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to update realm: ${error.message}`, 'red');
    throw error;
  }
}

async function createPasskeyRealm(token) {
  log(`\n🏗️  Creating realm: ${REALM_NAME}...`, 'yellow');

  const realmConfig = {
    realm: REALM_NAME,
    enabled: true,
    displayName: 'Development Passkeys Realm',
    displayNameHtml: '<div>Development Passkeys Realm</div>',
    loginTheme: 'keycloak',
    registrationAllowed: true,
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
    editUsernameAllowed: false,
    bruteForceProtected: true,
    sslRequired: 'none',
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
      log(`ℹ Realm '${REALM_NAME}' already exists, enforcing settings`, 'cyan');
      await updatePasskeyRealm(token);
      return false;
    }
    log(`✗ Failed to create realm: ${error.message}`, 'red');
    throw error;
  }
}

async function verifyRealm(token) {
  log(`\n✅ Verifying realm configuration...`, 'yellow');

  try {
    const response = await makeRequest(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const realm = response.data;
    
    log(`✓ Realm '${REALM_NAME}' is accessible`, 'green');
    log(`  Enabled: ${realm.enabled}`, 'cyan');
    log(`  Login Theme: ${realm.loginTheme}`, 'cyan');
    log(`  Display Name: ${realm.displayName}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`✗ Failed to verify realm: ${error.message}`, 'red');
    throw error;
  }
}

async function configureWebAuthnPasswordlessPolicy(token) {
  log('\n🔑 Configuring WebAuthn Passwordless policy for localhost...', 'yellow');

  const policyUpdate = {
    webAuthnPolicyPasswordlessRpId: WEBAUTHN_PASSWORDLESS_RP_ID,
    webAuthnPolicyPasswordlessRpEntityName: WEBAUTHN_PASSWORDLESS_RP_NAME,
    webAuthnPolicyPasswordlessExtraOrigins: [WEBAUTHN_PASSWORDLESS_ORIGIN],
    webAuthnPolicyPasswordlessUserVerificationRequirement:
      WEBAUTHN_PASSWORDLESS_USER_VERIFICATION,
    webAuthnPolicyPasswordlessAttestationConveyancePreference:
      WEBAUTHN_PASSWORDLESS_ATTESTATION,
  };

  try {
    await makeRequest(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: policyUpdate,
    });
    log('✓ WebAuthn Passwordless policy updated', 'green');
  } catch (error) {
    log(`✗ Failed to configure WebAuthn Passwordless policy: ${error.message}`, 'red');
    throw error;
  }
}

function toOriginList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function verifyWebAuthnPasswordlessPolicy(token) {
  log('\n✅ Verifying WebAuthn Passwordless policy persisted...', 'yellow');

  try {
    const response = await makeRequest(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const realm = response.data || {};
    const savedOrigins = toOriginList(realm.webAuthnPolicyPasswordlessExtraOrigins);

    const checks = [
      {
        label: 'RP ID',
        actual: realm.webAuthnPolicyPasswordlessRpId,
        expected: WEBAUTHN_PASSWORDLESS_RP_ID,
      },
      {
        label: 'RP Name',
        actual: realm.webAuthnPolicyPasswordlessRpEntityName,
        expected: WEBAUTHN_PASSWORDLESS_RP_NAME,
      },
      {
        label: 'User Verification',
        actual: realm.webAuthnPolicyPasswordlessUserVerificationRequirement,
        expected: WEBAUTHN_PASSWORDLESS_USER_VERIFICATION,
      },
      {
        label: 'Attestation Conveyance',
        actual: realm.webAuthnPolicyPasswordlessAttestationConveyancePreference,
        expected: WEBAUTHN_PASSWORDLESS_ATTESTATION,
      },
    ];

    for (const check of checks) {
      if (check.actual !== check.expected) {
        throw new Error(
          `${check.label} verification failed. Expected '${check.expected}', got '${check.actual}'`
        );
      }
    }

    if (!savedOrigins.includes(WEBAUTHN_PASSWORDLESS_ORIGIN)) {
      throw new Error(
        `Origin verification failed. Expected '${WEBAUTHN_PASSWORDLESS_ORIGIN}' in [${savedOrigins.join(', ')}]`
      );
    }

    log(`✓ RP ID: ${realm.webAuthnPolicyPasswordlessRpId}`, 'green');
    log(`✓ RP Name: ${realm.webAuthnPolicyPasswordlessRpEntityName}`, 'green');
    log(`✓ Origin includes: ${WEBAUTHN_PASSWORDLESS_ORIGIN}`, 'green');
    log(
      `✓ User Verification: ${realm.webAuthnPolicyPasswordlessUserVerificationRequirement}`,
      'green'
    );
    log(
      `✓ Attestation: ${realm.webAuthnPolicyPasswordlessAttestationConveyancePreference}`,
      'green'
    );
  } catch (error) {
    log(`✗ Failed to verify WebAuthn Passwordless policy: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  try {
    log('╔════════════════════════════════════════════╗', 'blue');
    log('║   Passkey Realm Setup Script              ║', 'blue');
    log('╚════════════════════════════════════════════╝', 'blue');
    
    log(`\nKeycloak URL: ${KEYCLOAK_URL}`, 'cyan');
    log(`Realm: ${REALM_NAME}`, 'cyan');

    // Step 1: Wait for Keycloak
    await waitForKeycloak();

    // Step 2: Get admin token
    const token = await getAdminToken();

    // Step 3: Create passkey realm
    await createPasskeyRealm(token);

    // Step 4: Verify realm
    await verifyRealm(token);

    // Step 5: Configure WebAuthn Passwordless realm policy
    await configureWebAuthnPasswordlessPolicy(token);

    // Step 6: Verify WebAuthn Passwordless policy
    await verifyWebAuthnPasswordlessPolicy(token);

    // Summary
    log('\n╔════════════════════════════════════════════╗', 'green');
    log('║        Setup Completed Successfully!       ║', 'green');
    log('╚════════════════════════════════════════════╝', 'green');

    log('\n📝 Realm Details:', 'yellow');
    log(`  • Name: ${REALM_NAME}`, 'green');
    log(`  • Status: Enabled`, 'green');
    log(`  • Login Theme: keycloak (default)`, 'green');
    log(`  • Passwordless RP ID: ${WEBAUTHN_PASSWORDLESS_RP_ID}`, 'green');
    log(`  • Passwordless RP Name: ${WEBAUTHN_PASSWORDLESS_RP_NAME}`, 'green');
    log(`  • Passwordless Origin: ${WEBAUTHN_PASSWORDLESS_ORIGIN}`, 'green');
    log(
      `  • Passwordless User Verification: ${WEBAUTHN_PASSWORDLESS_USER_VERIFICATION}`,
      'green'
    );
    log(`  • Passwordless Attestation: ${WEBAUTHN_PASSWORDLESS_ATTESTATION}`, 'green');

    log('\n🎉 Next Steps:', 'yellow');
    log(`  1. Access Admin Console: ${KEYCLOAK_URL}/admin/master/console/#/${REALM_NAME}`, 'cyan');
    const hostAdminConsoleUrl = getHostAdminConsoleUrl();
    if (hostAdminConsoleUrl) {
      log(`     (If running on your host, use: ${hostAdminConsoleUrl})`, 'yellow');
    }
    log(`  2. Configure passkey authentication flow`, 'cyan');
    log(`  3. Create test users for passkey testing`, 'cyan');

    log('\n🔗 Access URLs:', 'green');
    log(`   Keycloak Admin: ${KEYCLOAK_URL}/admin`, 'cyan');
    log(`   Realm Login: ${KEYCLOAK_URL}/realms/${REALM_NAME}/account`, 'cyan');

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
