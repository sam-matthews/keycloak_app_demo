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
const SOURCE_BROWSER_FLOW_ALIAS = 'browser';
const TARGET_BROWSER_FLOW_ALIAS = 'browser-passkey';
const PASSWORDLESS_REQUIRED_ACTION_ALIAS = 'webauthn-register-passwordless';
const USERNAME_PASSWORD_PROVIDER_ID = 'auth-username-password-form';
const COOKIE_AUTHENTICATOR_LABEL = 'Cookie';
const IDP_REDIRECTOR_LABEL = 'Identity Provider Redirector';
const USERNAME_PASSWORD_FORM_LABEL = 'Username Password Form';
const WEBAUTHN_PASSWORDLESS_LABEL = 'WebAuthn Passwordless Authenticator';
const WEBAUTHN_PASSWORDLESS_PROVIDER_ID = 'webauthn-authenticator-passwordless';
const CONDITIONAL_OTP_FLOW_LABEL = 'Conditional OTP';
const CONDITIONAL_USER_CONFIGURED_PROVIDER_ID = 'conditional-user-configured';
const OTP_FORM_PROVIDER_ID = 'auth-otp-form';
const REQUIREMENT_REQUIRED = 'REQUIRED';
const REQUIREMENT_ALTERNATIVE = 'ALTERNATIVE';
const LOGIN_MODE_PASSKEY_ONLY = 'passkey-only';
const LOGIN_MODE_MULTI_OPTION = 'multi-option';
const KEYCLOAK_LOGIN_MODE =
  (process.env.KEYCLOAK_LOGIN_MODE || LOGIN_MODE_MULTI_OPTION).toLowerCase();
const GOOGLE_IDP_CLIENT_ID = process.env.GOOGLE_IDP_CLIENT_ID || '';
const GOOGLE_IDP_CLIENT_SECRET = process.env.GOOGLE_IDP_CLIENT_SECRET || '';
const APPLE_IDP_CLIENT_ID = process.env.APPLE_IDP_CLIENT_ID || '';
const APPLE_IDP_CLIENT_SECRET = process.env.APPLE_IDP_CLIENT_SECRET || '';
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

function isPasskeyOnlyMode() {
  return KEYCLOAK_LOGIN_MODE === LOGIN_MODE_PASSKEY_ONLY;
}

function getDesiredPasswordlessRequirement() {
  return isPasskeyOnlyMode() ? REQUIREMENT_REQUIRED : REQUIREMENT_ALTERNATIVE;
}

function getDesiredUsernamePasswordRequirement() {
  return isPasskeyOnlyMode() ? 'ABSENT' : REQUIREMENT_ALTERNATIVE;
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
    registrationAllowed: !isPasskeyOnlyMode(),
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

async function updateRealmSettings(token) {
  log(`\n⚙️  Enforcing realm settings for mode '${KEYCLOAK_LOGIN_MODE}'...`, 'yellow');

  const realmConfig = {
    enabled: true,
    registrationAllowed: !isPasskeyOnlyMode(),
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
    editUsernameAllowed: false,
    bruteForceProtected: true,
    sslRequired: 'none',
  };

  await makeRequest(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: realmConfig,
  });

  log(
    `✓ Realm settings applied (registrationAllowed=${realmConfig.registrationAllowed})`,
    'green'
  );
}

async function getIdentityProviderInstances(token) {
  const response = await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(response.data) ? response.data : [];
}

async function upsertIdentityProvider(token, provider) {
  const providers = await getIdentityProviderInstances(token);
  const existing = providers.find(
    (item) => String(item.alias || '').toLowerCase() === String(provider.alias || '').toLowerCase()
  );

  if (existing) {
    await makeRequest(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances/${encodeURIComponent(provider.alias)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: {
          ...existing,
          ...provider,
        },
      }
    );
    log(`✓ Updated identity provider '${provider.alias}'`, 'green');
    return;
  }

  await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: provider,
    }
  );

  log(`✓ Created identity provider '${provider.alias}'`, 'green');
}

async function ensureSocialIdentityProviders(token) {
  log('\n🌐 Configuring optional social identity providers...', 'yellow');

  if (GOOGLE_IDP_CLIENT_ID && GOOGLE_IDP_CLIENT_SECRET) {
    await upsertIdentityProvider(token, {
      alias: 'google',
      providerId: 'google',
      displayName: 'Google',
      enabled: true,
      trustEmail: true,
      storeToken: false,
      addReadTokenRoleOnCreate: false,
      authenticateByDefault: false,
      firstBrokerLoginFlowAlias: 'first broker login',
      config: {
        clientId: GOOGLE_IDP_CLIENT_ID,
        clientSecret: GOOGLE_IDP_CLIENT_SECRET,
        defaultScope: 'openid profile email',
      },
    });
  } else {
    log('ℹ Google IdP not configured (set GOOGLE_IDP_CLIENT_ID and GOOGLE_IDP_CLIENT_SECRET)', 'cyan');
  }

  if (APPLE_IDP_CLIENT_ID && APPLE_IDP_CLIENT_SECRET) {
    try {
      await upsertIdentityProvider(token, {
        alias: 'apple',
        providerId: 'apple',
        displayName: 'Apple',
        enabled: true,
        trustEmail: true,
        storeToken: false,
        addReadTokenRoleOnCreate: false,
        authenticateByDefault: false,
        firstBrokerLoginFlowAlias: 'first broker login',
        config: {
          clientId: APPLE_IDP_CLIENT_ID,
          clientSecret: APPLE_IDP_CLIENT_SECRET,
          defaultScope: 'name email',
        },
      });
    } catch (error) {
      log(`ℹ Apple IdP was not configured automatically: ${error.message}`, 'cyan');
    }
  } else {
    log('ℹ Apple IdP not configured (set APPLE_IDP_CLIENT_ID and APPLE_IDP_CLIENT_SECRET)', 'cyan');
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

async function ensurePasswordlessRequiredAction(token) {
  log('\n🔐 Ensuring required action is available: WebAuthn Register Passwordless...', 'yellow');

  try {
    const response = await makeRequest(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/required-actions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const requiredActions = Array.isArray(response.data) ? response.data : [];
    const targetAction = requiredActions.find((action) => {
      const alias = String(action.alias || '').toLowerCase();
      const name = String(action.name || '').toLowerCase();
      const providerId = String(action.providerId || '').toLowerCase();

      return (
        alias === PASSWORDLESS_REQUIRED_ACTION_ALIAS ||
        providerId === PASSWORDLESS_REQUIRED_ACTION_ALIAS ||
        name === 'webauthn register passwordless'
      );
    });

    if (!targetAction) {
      const availableAliases = requiredActions
        .map((action) => action.alias)
        .filter(Boolean)
        .join(', ');
      throw new Error(
        `Required action 'WebAuthn Register Passwordless' is not available in realm '${REALM_NAME}'. Available aliases: ${availableAliases || 'none'}`
      );
    }

    const actionAlias = targetAction.alias || PASSWORDLESS_REQUIRED_ACTION_ALIAS;
    const shouldEnable = targetAction.enabled !== true;
    const desiredDefaultAction = !isPasskeyOnlyMode();
    const shouldUpdateDefault = targetAction.defaultAction !== desiredDefaultAction;

    if (!shouldEnable && !shouldUpdateDefault) {
      log(
        `✓ Required action already configured (enabled=true, defaultAction=${desiredDefaultAction})`,
        'green'
      );
      return;
    }

    await makeRequest(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/required-actions/${encodeURIComponent(actionAlias)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: {
          ...targetAction,
          enabled: true,
          defaultAction: desiredDefaultAction,
        },
      }
    );

    log(
      `✓ Required action configured (enabled=true, defaultAction=${desiredDefaultAction})`,
      'green'
    );
  } catch (error) {
    log(`✗ Failed to configure passwordless required action: ${error.message}`, 'red');
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

async function getAuthenticationFlows(token) {
  const response = await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/flows`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(response.data) ? response.data : [];
}

function findFlowByAlias(flows, alias) {
  const normalizedAlias = String(alias || '').toLowerCase();
  return flows.find((flow) => String(flow.alias || '').toLowerCase() === normalizedAlias);
}

async function copyBrowserFlowIfMissing(token, sourceAlias, targetAlias) {
  log(`\n🧩 Ensuring custom browser flow exists: ${targetAlias}...`, 'yellow');

  const flows = await getAuthenticationFlows(token);
  const existingTarget = findFlowByAlias(flows, targetAlias);
  if (existingTarget) {
    log(`✓ Authentication flow '${targetAlias}' already exists`, 'green');
    return;
  }

  const sourceFlow = findFlowByAlias(flows, sourceAlias);
  if (!sourceFlow) {
    throw new Error(`Source authentication flow '${sourceAlias}' was not found`);
  }

  await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/flows/${encodeURIComponent(sourceFlow.alias)}/copy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: {
        newName: targetAlias,
      },
    }
  );

  log(`✓ Authentication flow '${targetAlias}' created from '${sourceFlow.alias}'`, 'green');
}

async function verifyFlowExists(token, flowAlias) {
  log(`\n✅ Verifying authentication flow exists: ${flowAlias}...`, 'yellow');

  const flows = await getAuthenticationFlows(token);
  const flow = findFlowByAlias(flows, flowAlias);
  if (!flow) {
    throw new Error(`Authentication flow '${flowAlias}' was not found after setup`);
  }

  log(`✓ Authentication flow '${flowAlias}' is present`, 'green');
}

async function getRealmConfig(token) {
  const response = await makeRequest(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data || {};
}

async function setRealmBrowserFlow(token, flowAlias) {
  log(`\n🔁 Setting realm browser flow to '${flowAlias}'...`, 'yellow');

  const realmConfig = await getRealmConfig(token);
  const currentFlow = String(realmConfig.browserFlow || '');
  if (currentFlow.toLowerCase() === String(flowAlias).toLowerCase()) {
    log(`✓ Realm browser flow already set to '${flowAlias}'`, 'green');
    return;
  }

  await makeRequest(`${KEYCLOAK_URL}/admin/realms/${REALM_NAME}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: {
      browserFlow: flowAlias,
    },
  });

  log(`✓ Realm browser flow set to '${flowAlias}'`, 'green');
}

async function verifyRealmBrowserFlow(token, flowAlias) {
  log(`\n✅ Verifying realm uses browser flow '${flowAlias}'...`, 'yellow');

  const realmConfig = await getRealmConfig(token);
  const currentFlow = String(realmConfig.browserFlow || '');

  if (currentFlow.toLowerCase() !== String(flowAlias).toLowerCase()) {
    throw new Error(
      `Realm browser flow verification failed. Expected '${flowAlias}', got '${realmConfig.browserFlow || 'empty'}'`
    );
  }

  log(`✓ Realm browser flow is '${realmConfig.browserFlow}'`, 'green');
}

function normalizeExecutionValue(value) {
  return String(value || '').trim().toLowerCase();
}

function toExecutionSearchText(execution) {
  const parts = [
    execution.displayName,
    execution.authenticator,
    execution.authenticatorFlow,
    execution.providerId,
    execution.provider,
    execution.requirement,
    execution.alias,
  ];

  return parts
    .map((item) => normalizeExecutionValue(item))
    .filter(Boolean)
    .join(' | ');
}

function findExecutions(executions, candidates) {
  const normalizedCandidates = candidates.map((candidate) => normalizeExecutionValue(candidate));

  return executions.filter((execution) => {
    const searchText = toExecutionSearchText(execution);
    return normalizedCandidates.some((candidate) => searchText.includes(candidate));
  });
}

function findFirstExecution(executions, candidates) {
  const matches = findExecutions(executions, candidates);
  return matches.length > 0 ? matches[0] : null;
}

async function getFlowExecutions(token, flowAlias) {
  const response = await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/flows/${encodeURIComponent(flowAlias)}/executions`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(response.data) ? response.data : [];
}

async function addExecutionToFlow(token, flowAlias, providerId) {
  await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/flows/${encodeURIComponent(flowAlias)}/executions/execution`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: {
        provider: providerId,
      },
    }
  );
}

async function updateExecutionRequirement(token, flowAlias, execution, requirement) {
  const currentRequirement = normalizeExecutionValue(execution.requirement).toUpperCase();
  if (currentRequirement === requirement) {
    return;
  }

  await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/flows/${encodeURIComponent(flowAlias)}/executions`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: {
        ...execution,
        requirement,
      },
    }
  );
}

async function deleteExecution(token, executionId) {
  await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/authentication/executions/${encodeURIComponent(executionId)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
}

async function reconcileBrowserPasskeyFlowExecutions(token, flowAlias) {
  log(`\n🧭 Reconciling executions in '${flowAlias}' for mode '${KEYCLOAK_LOGIN_MODE}'...`, 'yellow');

  let executions = await getFlowExecutions(token, flowAlias);

  const usernameFormExecutions = findExecutions(executions, [
    USERNAME_PASSWORD_FORM_LABEL,
    'auth-username-password-form',
    'username-password-form',
  ]);

  const desiredUsernamePasswordRequirement = getDesiredUsernamePasswordRequirement();

  const otpExecutions = findExecutions(executions, [
    CONDITIONAL_OTP_FLOW_LABEL,
    CONDITIONAL_USER_CONFIGURED_PROVIDER_ID,
    OTP_FORM_PROVIDER_ID,
    'OTP Form',
  ]);

  for (const execution of otpExecutions) {
    await deleteExecution(token, execution.id);
  }

  if (otpExecutions.length > 0) {
    log(`✓ Removed ${otpExecutions.length} OTP-related execution(s) from '${flowAlias}'`, 'green');
    executions = await getFlowExecutions(token, flowAlias);
  }

  if (desiredUsernamePasswordRequirement === 'ABSENT') {
    for (const execution of usernameFormExecutions) {
      await deleteExecution(token, execution.id);
    }

    if (usernameFormExecutions.length > 0) {
      log(`✓ Removed ${usernameFormExecutions.length} username/password execution(s)`, 'green');
      executions = await getFlowExecutions(token, flowAlias);
    } else {
      log('✓ Username/password form execution is already absent', 'green');
    }
  } else {
    let usernameExecution = usernameFormExecutions[0] || null;
    if (!usernameExecution) {
      await addExecutionToFlow(token, flowAlias, USERNAME_PASSWORD_PROVIDER_ID);
      executions = await getFlowExecutions(token, flowAlias);
      usernameExecution = findFirstExecution(executions, [
        USERNAME_PASSWORD_FORM_LABEL,
        USERNAME_PASSWORD_PROVIDER_ID,
      ]);
    }

    if (!usernameExecution) {
      throw new Error(`Could not configure '${USERNAME_PASSWORD_FORM_LABEL}' in flow '${flowAlias}'`);
    }

    await updateExecutionRequirement(
      token,
      flowAlias,
      usernameExecution,
      desiredUsernamePasswordRequirement
    );
    log(
      `✓ '${USERNAME_PASSWORD_FORM_LABEL}' is set to ${desiredUsernamePasswordRequirement}`,
      'green'
    );
  }

  let passwordlessExecution = findFirstExecution(executions, [
    WEBAUTHN_PASSWORDLESS_LABEL,
    WEBAUTHN_PASSWORDLESS_PROVIDER_ID,
  ]);

  if (!passwordlessExecution) {
    await addExecutionToFlow(token, flowAlias, WEBAUTHN_PASSWORDLESS_PROVIDER_ID);
    executions = await getFlowExecutions(token, flowAlias);
    passwordlessExecution = findFirstExecution(executions, [
      WEBAUTHN_PASSWORDLESS_LABEL,
      WEBAUTHN_PASSWORDLESS_PROVIDER_ID,
    ]);
  }

  if (!passwordlessExecution) {
    throw new Error(
      `Could not locate '${WEBAUTHN_PASSWORDLESS_LABEL}' execution in flow '${flowAlias}' after attempting to add it`
    );
  }

  const desiredPasswordlessRequirement = getDesiredPasswordlessRequirement();
  await updateExecutionRequirement(token, flowAlias, passwordlessExecution, desiredPasswordlessRequirement);
  log(`✓ '${WEBAUTHN_PASSWORDLESS_LABEL}' is set to ${desiredPasswordlessRequirement}`, 'green');

  executions = await getFlowExecutions(token, flowAlias);

  const cookieExecution = findFirstExecution(executions, [
    COOKIE_AUTHENTICATOR_LABEL,
    'auth-cookie',
  ]);
  if (!cookieExecution) {
    throw new Error(`'${COOKIE_AUTHENTICATOR_LABEL}' execution was not found in flow '${flowAlias}'`);
  }
  await updateExecutionRequirement(token, flowAlias, cookieExecution, REQUIREMENT_ALTERNATIVE);
  log(`✓ '${COOKIE_AUTHENTICATOR_LABEL}' is set to ${REQUIREMENT_ALTERNATIVE}`, 'green');

  const idpExecution = findFirstExecution(executions, [
    IDP_REDIRECTOR_LABEL,
    'identity-provider-redirector',
    'idp-redirector',
  ]);
  if (!idpExecution) {
    throw new Error(`'${IDP_REDIRECTOR_LABEL}' execution was not found in flow '${flowAlias}'`);
  }
  await updateExecutionRequirement(token, flowAlias, idpExecution, REQUIREMENT_ALTERNATIVE);
  log(`✓ '${IDP_REDIRECTOR_LABEL}' is kept optional (${REQUIREMENT_ALTERNATIVE})`, 'green');
}

async function verifyBrowserPasskeyFlowExecutions(token, flowAlias) {
  log(`\n✅ Verifying '${flowAlias}' executions for mode '${KEYCLOAK_LOGIN_MODE}'...`, 'yellow');

  const executions = await getFlowExecutions(token, flowAlias);

  const otpExecutions = findExecutions(executions, [
    CONDITIONAL_OTP_FLOW_LABEL,
    CONDITIONAL_USER_CONFIGURED_PROVIDER_ID,
    OTP_FORM_PROVIDER_ID,
    'OTP Form',
  ]);
  if (otpExecutions.length > 0) {
    throw new Error(
      `Verification failed: OTP-related executions are still present in '${flowAlias}' (${otpExecutions.length} found)`
    );
  }

  const usernameFormExecutions = findExecutions(executions, [
    USERNAME_PASSWORD_FORM_LABEL,
    'auth-username-password-form',
    'username-password-form',
  ]);
  const desiredUsernamePasswordRequirement = getDesiredUsernamePasswordRequirement();
  if (desiredUsernamePasswordRequirement === 'ABSENT') {
    if (usernameFormExecutions.length > 0) {
      throw new Error(`Verification failed: '${USERNAME_PASSWORD_FORM_LABEL}' execution is still present`);
    }
  } else {
    if (usernameFormExecutions.length === 0) {
      throw new Error(`Verification failed: '${USERNAME_PASSWORD_FORM_LABEL}' execution is missing`);
    }

    const usernameExecution = usernameFormExecutions[0];
    if (
      normalizeExecutionValue(usernameExecution.requirement).toUpperCase() !==
      desiredUsernamePasswordRequirement
    ) {
      throw new Error(
        `Verification failed: '${USERNAME_PASSWORD_FORM_LABEL}' must be ${desiredUsernamePasswordRequirement}, got '${usernameExecution.requirement}'`
      );
    }
  }

  const passwordlessExecution = findFirstExecution(executions, [
    WEBAUTHN_PASSWORDLESS_LABEL,
    WEBAUTHN_PASSWORDLESS_PROVIDER_ID,
  ]);
  if (!passwordlessExecution) {
    throw new Error(`Verification failed: '${WEBAUTHN_PASSWORDLESS_LABEL}' execution is missing`);
  }
  const desiredPasswordlessRequirement = getDesiredPasswordlessRequirement();
  if (normalizeExecutionValue(passwordlessExecution.requirement).toUpperCase() !== desiredPasswordlessRequirement) {
    throw new Error(
      `Verification failed: '${WEBAUTHN_PASSWORDLESS_LABEL}' must be ${desiredPasswordlessRequirement}, got '${passwordlessExecution.requirement}'`
    );
  }

  const cookieExecution = findFirstExecution(executions, [
    COOKIE_AUTHENTICATOR_LABEL,
    'auth-cookie',
  ]);
  if (!cookieExecution) {
    throw new Error(`Verification failed: '${COOKIE_AUTHENTICATOR_LABEL}' execution is missing`);
  }
  if (normalizeExecutionValue(cookieExecution.requirement).toUpperCase() !== REQUIREMENT_ALTERNATIVE) {
    throw new Error(
      `Verification failed: '${COOKIE_AUTHENTICATOR_LABEL}' must be ${REQUIREMENT_ALTERNATIVE}, got '${cookieExecution.requirement}'`
    );
  }

  const idpExecution = findFirstExecution(executions, [
    IDP_REDIRECTOR_LABEL,
    'identity-provider-redirector',
    'idp-redirector',
  ]);
  if (!idpExecution) {
    throw new Error(`Verification failed: '${IDP_REDIRECTOR_LABEL}' execution is missing`);
  }
  if (normalizeExecutionValue(idpExecution.requirement).toUpperCase() !== REQUIREMENT_ALTERNATIVE) {
    throw new Error(
      `Verification failed: '${IDP_REDIRECTOR_LABEL}' must be ${REQUIREMENT_ALTERNATIVE}, got '${idpExecution.requirement}'`
    );
  }

  if (desiredUsernamePasswordRequirement === 'ABSENT') {
    log(`✓ '${USERNAME_PASSWORD_FORM_LABEL}' is not present`, 'green');
  } else {
    log(`✓ '${USERNAME_PASSWORD_FORM_LABEL}' is ${desiredUsernamePasswordRequirement}`, 'green');
  }
  log(`✓ '${WEBAUTHN_PASSWORDLESS_LABEL}' is ${desiredPasswordlessRequirement}`, 'green');
  log(`✓ '${COOKIE_AUTHENTICATOR_LABEL}' is optional`, 'green');
  log(`✓ '${IDP_REDIRECTOR_LABEL}' is optional`, 'green');
  log('✓ OTP-related executions are not present', 'green');
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

    // Step 4: Enforce realm settings for selected login mode
    await updateRealmSettings(token);

    // Step 5: Ensure custom browser authentication flow exists
    await copyBrowserFlowIfMissing(token, SOURCE_BROWSER_FLOW_ALIAS, TARGET_BROWSER_FLOW_ALIAS);

    // Step 6: Verify custom browser flow exists
    await verifyFlowExists(token, TARGET_BROWSER_FLOW_ALIAS);

    // Step 7: Set realm browser flow to the custom flow
    await setRealmBrowserFlow(token, TARGET_BROWSER_FLOW_ALIAS);

    // Step 8: Verify realm browser flow
    await verifyRealmBrowserFlow(token, TARGET_BROWSER_FLOW_ALIAS);

    // Step 9: Reconcile browser-passkey executions for selected mode
    await reconcileBrowserPasskeyFlowExecutions(token, TARGET_BROWSER_FLOW_ALIAS);

    // Step 10: Verify browser-passkey executions
    await verifyBrowserPasskeyFlowExecutions(token, TARGET_BROWSER_FLOW_ALIAS);

    // Step 11: Ensure passwordless required action availability
    await ensurePasswordlessRequiredAction(token);

    // Step 12: Configure optional social identity providers
    await ensureSocialIdentityProviders(token);

    // Step 13: Configure WebAuthn Passwordless realm policy
    await configureWebAuthnPasswordlessPolicy(token);

    // Step 14: Verify WebAuthn Passwordless policy
    await verifyWebAuthnPasswordlessPolicy(token);

    // Step 15: Create client
    const clientSecret = await createClient(token);

    // Step 16: Create test users
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
    log(`✓ Login Mode: ${KEYCLOAK_LOGIN_MODE}`, 'green');
    log(`✓ Browser Flow: ${TARGET_BROWSER_FLOW_ALIAS}`, 'green');
    if (isPasskeyOnlyMode()) {
      log(`✓ Removed: ${USERNAME_PASSWORD_FORM_LABEL}`, 'green');
    } else {
      log(`✓ Kept: ${USERNAME_PASSWORD_FORM_LABEL} (${REQUIREMENT_ALTERNATIVE})`, 'green');
    }
    log(`✓ Added: ${WEBAUTHN_PASSWORDLESS_LABEL} (${getDesiredPasswordlessRequirement()})`, 'green');
    log(`✓ Kept: ${COOKIE_AUTHENTICATOR_LABEL} (${REQUIREMENT_ALTERNATIVE})`, 'green');
    log(`✓ Kept: ${IDP_REDIRECTOR_LABEL} (${REQUIREMENT_ALTERNATIVE})`, 'green');
    log(
      `✓ Required Action: WebAuthn Register Passwordless (enabled, default=${!isPasskeyOnlyMode()})`,
      'green'
    );
    log('✓ Optional social IdPs: Google/Apple (configured when env vars are provided)', 'green');
    log(`✓ WebAuthn Passwordless RP ID: ${WEBAUTHN_PASSWORDLESS_RP_ID}`, 'green');
    log(`✓ WebAuthn Passwordless RP Name: ${WEBAUTHN_PASSWORDLESS_RP_NAME}`, 'green');
    log(`✓ WebAuthn Passwordless Origin: ${WEBAUTHN_PASSWORDLESS_ORIGIN}`, 'green');
    log(
      `✓ WebAuthn Passwordless User Verification: ${WEBAUTHN_PASSWORDLESS_USER_VERIFICATION}`,
      'green'
    );
    log(
      `✓ WebAuthn Passwordless Attestation: ${WEBAUTHN_PASSWORDLESS_ATTESTATION}`,
      'green'
    );
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
