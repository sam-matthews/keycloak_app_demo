const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'notesapp',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class Database {
  constructor() {
    this.pool = pool;
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database');
      client.release();
    } catch (err) {
      console.error('Error connecting to database:', err);
      throw err;
    }
  }

  async init() {
    await this.connect();
    
    const createNotesTable = `
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.pool.query(createNotesTable);
      console.log('Notes table created successfully');
    } catch (err) {
      console.error('Error creating notes table:', err);
      throw err;
    }
  }

  async getNotesByUserId(userId) {
    const sql = 'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC';
    try {
      const result = await this.pool.query(sql, [userId]);
      return result.rows;
    } catch (err) {
      console.error('Error fetching notes:', err);
      throw err;
    }
  }

  async createNote(note) {
    const sql = `
      INSERT INTO notes (user_id, user_email, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    try {
      const result = await this.pool.query(sql, [
        note.user_id,
        note.user_email,
        note.title,
        note.content
      ]);
      return result.rows[0];
    } catch (err) {
      console.error('Error creating note:', err);
      throw err;
    }
  }

  async updateNote(id, userId, note) {
    const sql = `
      UPDATE notes 
      SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    try {
      const result = await this.pool.query(sql, [
        note.title,
        note.content,
        id,
        userId
      ]);
      return {
        updated: result.rowCount > 0,
        note: result.rows[0]
      };
    } catch (err) {
      console.error('Error updating note:', err);
      throw err;
    }
  }

  async deleteNote(id, userId) {
    const sql = 'DELETE FROM notes WHERE id = $1 AND user_id = $2';
    try {
      const result = await this.pool.query(sql, [id, userId]);
      return { deleted: result.rowCount > 0 };
    } catch (err) {
      console.error('Error deleting note:', err);
      throw err;
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing database pool:', err);
      throw err;
    }
  }
}

module.exports = new Database();