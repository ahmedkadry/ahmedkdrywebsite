const { render } = require('ejs');
//const db = require('../db');
const { db } = require('../db');

const listStmt = db.prepare(`
  SELECT s.*, u.name AS account_name
  FROM students s LEFT JOIN users u ON u.id = s.user_id
  WHERE (@q IS NULL OR s.first_name LIKE @like OR s.last_name LIKE @like OR s.email LIKE @like)
  ORDER BY s.id DESC
  LIMIT @limit OFFSET @offset
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) AS n FROM students
  WHERE (@q IS NULL OR first_name LIKE @like OR last_name LIKE @like OR email LIKE @like)
`);

exports.list = (req, res) => {
    const q = (req.query.q || '').trim() || null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const params = { q, like: q ? `%${q}%` : null, limit, offset };
    const rows = listStmt.all(params);
    const total = countStmt.get(params).n;
    res.json({ data: rows, page, limit, total });
};

exports.get = (req, res) => {
    const row = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    // student can only view their own
    if (req.user.role === 'student' && row.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(row);
};

exports.create = (req, res) => {
    const { first_name, last_name, email, phone, date_of_birth, grade_level, status } = req.body || {};
    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'first_name, last_name, email required' });
    }
    try {
        const info = db.prepare(`
      INSERT INTO students (first_name,last_name,email,phone,date_of_birth,grade_level,status)
      VALUES (?,?,?,?,?,?,?)
    `).run(first_name, last_name, email, phone || null, date_of_birth || null, grade_level || null, status || 'active');
        res.status(201).json(db.prepare('SELECT * FROM students WHERE id=?').get(info.lastInsertRowid));
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email already in use' });
        throw e;
    }
    res.redirect('/dashboard');
};

exports.update = (req, res) => {
    const existing = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Student not found' });
    const merged = { ...existing, ...req.body };
    try {
        db.prepare(`
      UPDATE students SET first_name=@first_name,last_name=@last_name,email=@email,
        phone=@phone,date_of_birth=@date_of_birth,grade_level=@grade_level,status=@status
      WHERE id=@id
    `).run({ ...merged, id: existing.id });
        res.json(db.prepare('SELECT * FROM students WHERE id=?').get(existing.id));
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email already in use' });
        throw e;
    }
};

exports.remove = (req, res) => {
    const changes = db.prepare('DELETE FROM students WHERE id=?').run(req.params.id).changes;
    if (!changes) return res.status(404).json({ error: 'Student not found' });
    res.status(204).end();
};

exports.me = (req, res) => {
    const row = db.prepare('SELECT * FROM students WHERE user_id=?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'No student record linked to your account' });
    res.json(row);
};