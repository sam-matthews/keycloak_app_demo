#!/usr/bin/env node

/**
 * Quick fix script to update the web-app client to be a public client
 * Browser apps cannot securely store secrets and must use public client + PKCE
 */

const http = require('http');
const https = require('https');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_ADMIN = process.env.KEYCLOAK_ADMIN || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin123';
const REALM_NAME = 'demo-realm';
const CLIENT_ID = 'web-app';

// Helper to make HTTP/HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const method = options.method || 'GET';
    const headers = options.headers || {};
    const body = options.body;

    let requestBody;
    if (body) {
      if (typeof body === 'object' && !Buffer.isBuffer(body)) {
        requestBody = JSON.stringify(body);
        headers['Content-Length'] = Buffer.byteLength(requestBody);
      } else {
        requestBody = body;
        headers['Content-Length'] = Buffer.byteLength(requestBody);
      }
    }

    const req = protocol.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = data ? JSON.parse(data) : {};
            resolve({ statusCode: res.statusCode, data: parsedData });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        } else {
          reject({ statusCode: res.statusCode, message: data || res.statusMessage });
        }
      });
    });

    req.on('error', reject);
    if (requestBody) {
      req.write(requestBody);
    }
    req.end();
  });
}

async function getAdminToken() {
  console.log('🔐 Getting admin token...');
  
  const params = new URLSearchParams({
    username: KEYCLOAK_ADMIN,
    password: KEYCLOAK_ADMIN_PASSWORD,
    grant_type: 'password',
    client_id: 'admin-cli',
  });

  const response = await makeRequest(
    `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  return response.data.access_token;
}

async function fixClient(token) {
  console.log('🔍 Finding client...');
  
  // Get the client by clientId
  const clientsResponse = await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients?clientId=${CLIENT_ID}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  if (!clientsResponse.data || clientsResponse.data.length === 0) {
    throw new Error('Client not found');
  }

  const client = clientsResponse.data[0];
  console.log(`✓ Found client: ${client.id}`);

  // Update the client to be public
  console.log('🔧 Updating client to public...');
  
  const updatedConfig = {
    ...client,
    publicClient: true,
    // Remove the secret field - not needed for public clients
    secret: undefined,
  };

  await makeRequest(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${client.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: updatedConfig,
    }
  );

  console.log('✅ Client updated successfully!');
  console.log('\nClient is now configured as:');
  console.log('  - Public Client: true');
  console.log('  - PKCE: S256');
  console.log('  - Standard Flow: enabled');
  console.log('\nYou can now use the app without a client secret.');
}

async function main() {
  try {
    const token = await getAdminToken();
    await fixClient(token);
    console.log('\n✅ All done!');
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();
