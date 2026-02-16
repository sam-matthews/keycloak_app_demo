import React, { createContext, useContext } from 'react';
import UserService from '../services/keycloak';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    
    console.log('AuthContext: Starting Keycloak initialization...');
    
    const initAuth = async () => {
      try {
        await UserService.initKeycloak(
          () => {
            if (isMounted) {
              console.log('AuthContext: Keycloak initialized successfully');
              setIsAuthenticated(UserService.isLoggedIn());
              setUser(UserService.getTokenParsed());
              setIsLoading(false);
            }
          },
          (err) => {
            if (isMounted) {
              console.error('AuthContext: Keycloak initialization error:', err);
              setError(err);
              setIsLoading(false);
            }
          }
        );
      } catch (err) {
        if (isMounted) {
          console.error('AuthContext: Failed to initialize:', err);
          setError(err);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const eventListener = (event) => {
      if (!isMounted) return;
      
      if (event === 'onAuthSuccess') {
        setIsAuthenticated(true);
        setUser(UserService.getTokenParsed());
      } else if (event === 'onAuthLogout') {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    UserService.keycloak.onAuthSuccess = () => eventListener('onAuthSuccess');
    UserService.keycloak.onAuthLogout = () => eventListener('onAuthLogout');
    UserService.keycloak.onTokenExpired = () => {
      if (isMounted) {
        UserService.updateToken(() => {
          setUser(UserService.getTokenParsed());
        });
      }
    };

    return () => {
      isMounted = false;
    };
  }, []);

  const login = () => {
    UserService.doLogin();
  };

  const logout = () => {
    UserService.doLogout();
  };

  const getToken = () => UserService.getToken();

  const value = {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout,
    getToken,
    getUsername: UserService.getUsername,
    hasRole: UserService.hasRole
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'red' }}>
          <h2>Authentication Error</h2>
          <p>{error.message || String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};