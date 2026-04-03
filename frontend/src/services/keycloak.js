import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'demo-realm',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'web-app'
};

const keycloak = new Keycloak(keycloakConfig);

let isInitialized = false;
let initPromise = null;

const finishInit = (authenticated, onAuthenticatedCallback) => {
  if (onAuthenticatedCallback) {
    onAuthenticatedCallback();
  }
  return authenticated;
};

const initKeycloak = (onAuthenticatedCallback, onErrorCallback) => {
  // React StrictMode can mount twice in development. Reuse in-flight init to avoid races.
  if (initPromise) {
    return initPromise
      .then((authenticated) => finishInit(authenticated, onAuthenticatedCallback))
      .catch((error) => {
        if (onErrorCallback) {
          onErrorCallback(error);
          return false;
        }
        throw error;
      });
  }

  if (isInitialized) {
    console.log('Keycloak already initialized, authenticated:', keycloak.authenticated);
    return Promise.resolve(finishInit(keycloak.authenticated, onAuthenticatedCallback));
  }

  console.log('Starting Keycloak initialization...');

  initPromise = keycloak.init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    pkceMethod: 'S256',
    checkLoginIframe: false
  })
  .then((authenticated) => {
    isInitialized = true;
    console.log('Keycloak init complete - authenticated:', authenticated);
    if (!authenticated) {
      console.log('User not authenticated; waiting for explicit login action');
    } else {
      console.log('User authenticated successfully');
    }
    return finishInit(authenticated, onAuthenticatedCallback);
  })
  .catch((error) => {
    console.error('Keycloak init error:', error);
    isInitialized = false; // Reset on error so it can be retried
    if (onErrorCallback) {
      onErrorCallback(error);
      return false;
    } else {
      throw error;
    }
  })
  .finally(() => {
    initPromise = null;
  });

  return initPromise;
};

const doLogin = () =>
  keycloak.login({ redirectUri: window.location.origin + window.location.pathname });

const doLogout = () => keycloak.logout({ redirectUri: window.location.origin });

const getToken = () => keycloak.token;

const getTokenParsed = () => keycloak.tokenParsed;

const isLoggedIn = () => !!keycloak.token;

const updateToken = (successCallback) => 
  keycloak.updateToken(5).then(successCallback).catch(doLogin);

const getUsername = () => keycloak.tokenParsed?.preferred_username;

const hasRole = (roles) => roles.some((role) => keycloak.hasRealmRole(role));

const UserService = {
  initKeycloak,
  doLogin,
  doLogout,
  getToken,
  getTokenParsed,
  isLoggedIn,
  updateToken,
  getUsername,
  hasRole,
  keycloak
};

export default UserService;