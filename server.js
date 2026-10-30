// app.js — Express app configured for Vercel serverless + local dev
require('dotenv').config({ path: '.env.development.local' }); // no-op on Vercel

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { loadUser } = require('./middleware/auth');
const { initDb } = require('./db');   // async — returns a Promise

const app = express();

// ── View engine (absolute paths — required on Vercel) ───
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Core middleware ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static files FIRST — they serve directly and skip DB init,
// so the site stays up even if Turso is unreachable.
app.use(express.static(path.join(__dirname, 'public')));

// ── Cold-start DB init (cached per container) ──────────
let dbReady = null;
function ensureDb() {
    if (!dbReady) {
        dbReady = initDb().catch((err) => {
            console.error('[db] init failed:', err);
            dbReady = null;      // allow retry on next request
            throw err;
        });
    }
    return dbReady;
}

app.use(async (req, res, next) => {
    try { await ensureDb(); next(); }
    catch { res.status(500).json({ error: 'Database unavailable' }); }
});

// ── Attach req.user + res.locals.user ──────────────────
app.use(loadUser);

// ── Health check (extremely useful for Vercel debugging) ──
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        env: process.env.VERCEL === '1' ? 'vercel' : 'local',
        ts: Date.now(),
    });
});

// ── Page routes (EJS) ──────────────────────────────────
app.use('/', require('./routes/pages'));

// ── API routes (JSON) ──────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));

// ── 404 ────────────────────────────────────────────────
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.status(404).render('404', { title: 'Page not found' });
});

// ── Error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[error]', err);
    if (res.headersSent) return next(err);

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint/.test(err.message || '')) {
        return res.status(409).json({ error: 'Duplicate value' });
    }
    res.status(500).json({ error: 'Internal server error' });
});

// ── Local listener — skipped on Vercel ─────────────────
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;