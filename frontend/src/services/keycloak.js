import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'demo-realm',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'web-app'
};

const keycloak = new Keycloak(keycloakConfig);

let isInitialized = false;

const initKeycloak = (onAuthenticatedCallback, onErrorCallback) => {
  // Prevent multiple initializations (React StrictMode calls useEffect twice)
  if (isInitialized) {
    console.log('Keycloak already initialized, authenticated:', keycloak.authenticated);
    // Always call the callback to allow the app to finish loading
    if (keycloak.authenticated && onAuthenticatedCallback) {
      onAuthenticatedCallback();
    } else if (!keycloak.authenticated && onErrorCallback) {
      // Not authenticated but already initialized - let the app know it's done loading
      onAuthenticatedCallback && onAuthenticatedCallback();
    }
    return Promise.resolve(keycloak.authenticated);
  }

  isInitialized = true;
  console.log('Starting Keycloak initialization...');

  return keycloak.init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    pkceMethod: 'S256',
    checkLoginIframe: false
  })
  .then((authenticated) => {
    console.log('Keycloak init complete - authenticated:', authenticated);
    if (!authenticated) {
      console.log('User not authenticated, redirecting to login...');
      keycloak.login();
    } else {
      console.log('User authenticated successfully');
      if (onAuthenticatedCallback) {
        onAuthenticatedCallback();
      }
    }
    return authenticated;
  })
  .catch((error) => {
    console.error('Keycloak init error:', error);
    isInitialized = false; // Reset on error so it can be retried
    if (onErrorCallback) {
      onErrorCallback(error);
    } else {
      throw error;
    }
  });
};

const doLogin = () => keycloak.login();

const doLogout = () => keycloak.logout();

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