// db.js
require('dotenv').config({ path: '.env.development.local' }); // no-op on Vercel

const { createClient } = require('@libsql/client/web'); // ← /web is required on Vercel
const bcrypt = require('bcryptjs');

// ── 1. Validate env vars BEFORE createClient ─────────────
// This is the fix for `LibsqlError: URL_INVALID`.
function requireEnv(name) {
    const v = process.env[name];
    if (v === undefined || v === null || String(v).trim() === '') {
        throw new Error(
            `[db] Missing env var ${name}. Set it in Vercel → Settings → Environment Variables ` +
            `(Production) and redeploy.`
        );
    }
    return String(v).trim();
}

// Strip accidental surrounding quotes — a very common copy-paste artifact
function unquote(s) {
    return s.replace(/^["'`]|["'`]$/g, '');
}

const TURSO_URL = unquote(requireEnv('TURSO_DATABASE_URL'));
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
    ? unquote(process.env.TURSO_AUTH_TOKEN)
    : undefined;

// Shape check — catches pasted-HTML, wrong protocol, missing scheme
if (!/^(libsql|https?|wss?):\/\//i.test(TURSO_URL)) {
    throw new Error(
        `[db] TURSO_DATABASE_URL is not a valid libsql URL: ${JSON.stringify(TURSO_URL)}. ` +
        `Expected something like "libsql://my-db-my-org.turso.io".`
    );
}

// ── 2. Client ────────────────────────────────────────────
const db = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
});

// ── 3. Convenience wrappers (async) ──────────────────────
// These replace `db.prepare(sql).all()/.get()/.run()` from better-sqlite3.
// Signature: get(sql, args?) / all(sql, args?) / run(sql, args?)
// `args` may be an array or a single value.
const normalizeArgs = (a) =>
    a === undefined ? [] : Array.isArray(a) ? a : [a];

async function all(sql, args) {
    const r = await db.execute({ sql, args: normalizeArgs(args) });
    return r.rows;
}

async function get(sql, args) {
    const r = await db.execute({ sql, args: normalizeArgs(args) });
    return r.rows[0] ?? null;
}

async function run(sql, args) {
    const r = await db.execute({ sql, args: normalizeArgs(args) });
    return {
        changes: r.rowsAffected,
        lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null,
    };
}

// ── 4. Schema + seed (run once per cold container) ───────
async function initDb() {
    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'student'
                      CHECK(role IN ('admin','teacher','student')),
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS students (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
        first_name    TEXT NOT NULL,
        last_name     TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        phone         TEXT,
        date_of_birth TEXT,
        grade_level   TEXT,
        status        TEXT DEFAULT 'active'
                      CHECK(status IN ('active','inactive','graduated')),
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS courses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        code        TEXT NOT NULL UNIQUE,
        name        TEXT NOT NULL,
        description TEXT,
        credits     INTEGER DEFAULT 3,
        teacher_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE INDEX IF NOT EXISTS idx_students_email   ON students(email)`,
            `CREATE INDEX IF NOT EXISTS idx_courses_teacher  ON courses(teacher_id)`,
        ],
        'write'
    );

    // Seed admin once
    const existing = await get("SELECT 1 FROM users WHERE role='admin' LIMIT 1");
    if (!existing) {
        const hash = bcrypt.hashSync('admin123', 10);
        await run(
            "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)",
            ['Administrator', 'admin@school.local', hash, 'admin']
        );
        console.log('✓ Seeded admin → admin@school.local / admin123');
    }
}

module.exports = { db, initDb, get, all, run };