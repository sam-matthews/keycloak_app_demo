const express = require('express');
const database = require('../../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const notes = await database.getNotesByUserId(req.user.sub);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const note = {
      user_id: req.user.sub,
      user_email: req.user.email,
      title: title.trim(),
      content: content ? content.trim() : ''
    };

    const createdNote = await database.createNote(note);
    res.status(201).json(createdNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const note = {
      title: title.trim(),
      content: content ? content.trim() : ''
    };

    const result = await database.updateNote(id, req.user.sub, note);
    
    if (!result.updated) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    res.json({ id, ...note });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await database.deleteNote(id, req.user.sub);

    if (!result.deleted) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;