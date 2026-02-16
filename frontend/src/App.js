import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NotesList from './components/NotesList';
import NoteForm from './components/NoteForm';
import './App.css';

function AppContent() {
  const { isAuthenticated, user, login, logout, getToken } = useAuth();
  const [showForm, setShowForm] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleNoteSubmit = () => {
    setShowForm(false);
    setEditingNote(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNote(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Keycloak Demo App</h1>
          <p>A simple note-taking application with Keycloak authentication</p>
          <button className="login-btn" onClick={login}>
            Login with Keycloak
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>My Notes</h1>
          <div className="user-info">
            <span className="username">
              Welcome, {user?.preferred_username || user?.name || 'User'}
            </span>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {!showForm && (
            <div className="actions">
              <button className="create-btn" onClick={() => setShowForm(true)}>
                + Create New Note
              </button>
            </div>
          )}

          {showForm && (
            <NoteForm
              getToken={getToken}
              note={editingNote}
              onSubmit={handleNoteSubmit}
              onCancel={handleCancel}
            />
          )}

          <NotesList
            getToken={getToken}
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
