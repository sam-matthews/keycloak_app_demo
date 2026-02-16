import React, { useState, useEffect, useCallback } from 'react';
import noteService from '../services/noteService';
import './NotesList.css';

const NotesList = ({ getToken, onEdit, refreshTrigger }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      console.log('Fetching notes with token:', token ? 'present' : 'missing');
      const data = await noteService.getAllNotes(token);
      setNotes(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch notes');
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshTrigger]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        const token = getToken();
        await noteService.deleteNote(id, token);
        setNotes(notes.filter(note => note.id !== id));
      } catch (err) {
        setError('Failed to delete note');
        console.error('Error deleting note:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchNotes}>Retry</button>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <p>No notes yet. Create your first note!</p>
      </div>
    );
  }

  return (
    <div className="notes-list">
      <h2>Your Notes</h2>
      {notes.map((note) => (
        <div key={note.id} className="note-card">
          <div className="note-header">
            <h3>{note.title}</h3>
            <div className="note-actions">
              <button 
                className="edit-btn" 
                onClick={() => onEdit(note)}
                aria-label="Edit note"
              >
                ✎
              </button>
              <button 
                className="delete-btn" 
                onClick={() => handleDelete(note.id)}
                aria-label="Delete note"
              >
                ×
              </button>
            </div>
          </div>
          {note.content && <p className="note-content">{note.content}</p>}
          <div className="note-meta">
            <small>Created: {formatDate(note.created_at)}</small>
            {note.updated_at !== note.created_at && (
              <small>Updated: {formatDate(note.updated_at)}</small>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotesList;