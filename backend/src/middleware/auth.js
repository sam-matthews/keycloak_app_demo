const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'demo-realm';

const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.log('Auth failed: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  console.log('Verifying token...');
  
  // Decode token without verification first to get the issuer
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded) {
    console.error('Failed to decode token');
    return res.status(401).json({ error: 'Invalid token format' });
  }

  // The token issuer will be http://localhost:8080/realms/demo-realm from browser
  // but backend uses http://keycloak:8080 internally
  // Accept both localhost and keycloak as valid issuers
  const tokenIssuer = decoded.payload.iss;
  const validIssuers = [
    `http://localhost:8080/realms/${KEYCLOAK_REALM}`,
    `http://keycloak:8080/realms/${KEYCLOAK_REALM}`,
    `https://localhost:8080/realms/${KEYCLOAK_REALM}`,
  ];

  if (!validIssuers.includes(tokenIssuer)) {
    console.error('Invalid issuer:', tokenIssuer);
    console.error('Expected one of:', validIssuers.join(', '));
    return res.status(401).json({ error: 'Invalid token issuer' });
  }

  // Now verify with the actual issuer from the token
  jwt.verify(token, getKey, {
    issuer: tokenIssuer,
    algorithms: ['RS256']
  }, (err, verified) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token', details: err.message });
    }

    console.log('Token verified successfully for user:', verified.preferred_username || verified.sub);

    req.user = {
      sub: verified.sub,
      email: verified.email,
      name: verified.name,
      preferred_username: verified.preferred_username,
      roles: verified.realm_access?.roles || []
    };

    next();
  });
};

const checkRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.user.roles.includes(requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};