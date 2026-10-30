const db = require('../db');

// ── Prepared statements (compiled once at startup) ─────────────────
const baseSelect = `
  SELECT c.*, u.name AS teacher_name, u.email AS teacher_email
  FROM courses c
  LEFT JOIN users u ON u.id = c.teacher_id
`;

const listStmt = db.prepare(`${baseSelect} ORDER BY c.code`);
const listMineStmt = db.prepare(`${baseSelect} WHERE c.teacher_id = ? ORDER BY c.code`);
const getStmt = db.prepare(`${baseSelect} WHERE c.id = ?`);

const insertStmt = db.prepare(`
  INSERT INTO courses (code, name, description, credits, teacher_id)
  VALUES (@code, @name, @description, @credits, @teacher_id)
`);

const updateStmt = db.prepare(`
  UPDATE courses
     SET code        = @code,
         name        = @name,
         description = @description,
         credits     = @credits,
         teacher_id  = @teacher_id
   WHERE id = @id
`);

const deleteStmt = db.prepare('DELETE FROM courses WHERE id = ?');
const teacherExistsStmt = db.prepare("SELECT 1 FROM users WHERE id = ? AND role = 'teacher'");

// ── Validation helper ───────────────────────────────────────────────
function validate(body, { partial = false } = {}) {
    const errors = [];

    if (!partial || body.code !== undefined) {
        if (typeof body.code !== 'string' || !body.code.trim())
            errors.push('code is required');
    }
    if (!partial || body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim().length < 2)
            errors.push('name must be at least 2 characters');
    }
    if (body.credits !== undefined && body.credits !== null) {
        const n = Number(body.credits);
        if (!Number.isInteger(n) || n < 1 || n > 12)
            errors.push('credits must be an integer between 1 and 12');
    }
    if (body.teacher_id !== undefined && body.teacher_id !== null) {
        if (!teacherExistsStmt.get(body.teacher_id))
            errors.push('teacher_id must reference an existing teacher');
    }
    return errors;
}

// ── GET /api/courses ─── every authenticated user ────────────────────
exports.list = (req, res) => {
    res.json(listStmt.all());
};

// ── GET /api/courses/mine ─── teacher only ───────────────────────────
exports.listMine = (req, res) => {
    res.json(listMineStmt.all(req.user.id));
};

// ── GET /api/courses/:id ─── any auth, teachers restricted to own ────
exports.get = (req, res) => {
    const course = getStmt.get(Number(req.params.id));
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (req.user.role === 'teacher' && course.teacher_id !== req.user.id)
        return res.status(403).json({ error: 'Forbidden' });

    res.json(course);
};

// ── POST /api/courses ─── admin only ─────────────────────────────────
exports.create = (req, res) => {
    const body = req.body || {};
    const errors = validate(body);
    if (errors.length) return res.status(400).json({ errors });

    const row = {
        code: body.code.trim(),
        name: body.name.trim(),
        description: body.description || null,
        credits: Number.isInteger(body.credits) ? body.credits : 3,
        teacher_id: body.teacher_id ?? null,
    };

    try {
        const info = insertStmt.run(row);
        res.status(201).json(getStmt.get(info.lastInsertRowid));
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
            return res.status(409).json({ error: 'Course code already exists' });
        throw e;
    }
};

// ── PUT /api/courses/:id ─── admin only ──────────────────────────────
exports.update = (req, res) => {
    const existing = getStmt.get(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Course not found' });

    const body = req.body || {};
    const errors = validate(body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const merged = {
        id: existing.id,
        code: body.code?.trim() ?? existing.code,
        name: body.name?.trim() ?? existing.name,
        description: body.description ?? existing.description,
        credits: body.credits ?? existing.credits,
        teacher_id: body.teacher_id ?? existing.teacher_id,
    };

    try {
        updateStmt.run(merged);
        res.json(getStmt.get(existing.id));
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
            return res.status(409).json({ error: 'Course code already exists' });
        throw e;
    }
};

// ── DELETE /api/courses/:id ─── admin only ───────────────────────────
exports.remove = (req, res) => {
    const n = deleteStmt.run(Number(req.params.id)).changes;
    if (!n) return res.status(404).json({ error: 'Course not found' });
    res.status(204).end();
};