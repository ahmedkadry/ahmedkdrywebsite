const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, cookieOpts } = require('../middleware/auth');

const wantsHtml = (req) => req.is('application/x-www-form-urlencoded');

exports.register = (req, res) => {
    const html = wantsHtml(req);
    const fail = (msg, code = 400) =>
        html
            ? res.status(code).render('auth', { title: 'Create account', mode: 'register', error: msg })
            : res.status(code).json({ error: msg });

    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return fail('All fields are required');
    if (password.length < 6) return fail('Password must be at least 6 characters');
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email))
        return fail('Email already registered', 409);

    const hash = bcrypt.hashSync(password, 10);
    const info = db
        .prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'student')")
        .run(name, email, hash);
    const user = db
        .prepare('SELECT id,name,email,role FROM users WHERE id=?')
        .get(info.lastInsertRowid);

    // Auto-link / create student record
    const [first, ...rest] = name.trim().split(/\s+/);
    const last = rest.join(' ') || '—';
    const existing = db.prepare('SELECT * FROM students WHERE email=?').get(email);
    if (existing) {
        if (!existing.user_id)
            db.prepare('UPDATE students SET user_id=? WHERE id=?').run(user.id, existing.id);
    } else {
        db.prepare(
            "INSERT INTO students (user_id,first_name,last_name,email,status) VALUES (?,?,?,?,'active')"
        ).run(user.id, first, last, email);
    }

    res.cookie('token', signToken(user), cookieOpts());
    if (html) return res.redirect('/dashboard');
    res.status(201).json({ user });
};

exports.login = (req, res) => {
    const html = wantsHtml(req);
    const fail = (msg, code = 400) =>
        html
            ? res.status(code).render('auth', { title: 'Sign in', mode: 'login', error: msg })
            : res.status(code).json({ error: msg });

    const { email, password } = req.body || {};
    if (!email || !password) return fail('Email and password required');
    const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!row || !bcrypt.compareSync(password, row.password_hash))
        return fail('Invalid credentials', 401);

    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    res.cookie('token', signToken(user), cookieOpts());
    if (html) return res.redirect('/dashboard');
    res.json({ user });
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    if (wantsHtml(req)) return res.redirect('/');
    res.json({ ok: true });
};

exports.me = (req, res) => res.json({ user: req.user });