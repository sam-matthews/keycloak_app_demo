import React, { useState, useEffect } from 'react';
import noteService from '../services/noteService';
import './NoteForm.css';

const NoteForm = ({ getToken, note, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
    }
  }, [note]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      console.log('Saving note with token:', token ? 'present' : 'missing');

      if (note) {
        await noteService.updateNote(note.id, { title, content }, token);
      } else {
        await noteService.createNote({ title, content }, token);
      }

      onSubmit();
    } catch (err) {
      setError(note ? 'Failed to update note' : 'Failed to create note');
      console.error('Error saving note:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="note-form-container">
      <form className="note-form" onSubmit={handleSubmit}>
        <h2>{note ? 'Edit Note' : 'Create New Note'}</h2>
        
        {error && <div className="form-error">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter note content"
            rows="8"
            disabled={loading}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Saving...' : (note ? 'Update Note' : 'Create Note')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoteForm;
