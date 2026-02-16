import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const noteService = {
  getAllNotes: async (token) => {
    const response = await api.get('/api/notes', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  createNote: async (note, token) => {
    const response = await api.post('/api/notes', note, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  updateNote: async (id, note, token) => {
    const response = await api.put(`/api/notes/${id}`, note, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  deleteNote: async (id, token) => {
    const response = await api.delete(`/api/notes/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export default noteService;