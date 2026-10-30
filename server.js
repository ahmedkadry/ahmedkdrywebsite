const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
// server.js
const session = require('express-session');
const flash = require('connect-flash');

require('./db');
const { loadUser } = require('./middleware/auth');

const app = express();

// ── EJS ─────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Body / cookies / static ─────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // for HTML form posts
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Attach req.user + res.locals.user from JWT cookie
app.use(loadUser);

// ── Page routes (server-rendered) ───────────────────
app.use('/', require('./routes/pages'));

// ── API routes (JSON) ───────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));

// ── 404 ─────────────────────────────────────────────
app.use((req, res) => {
    if (req.path.startsWith('/api/'))
        return res.status(404).json({ error: 'API route not found' });
    res.status(404).render('404', { title: 'Page not found' });
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(flash());


app.use((req, res, next) => {
    res.locals.flash = { success: req.flash('success'), error: req.flash('error') };
    const orig = res.render.bind(res);
    res.render = (view, opts, cb) => {
        console.log(`render → ${view}`, opts && Object.keys(opts));
        return orig(view, opts, cb);
    };
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));


// Export for Vercel Serverless
module.exports = app;

// Only listen if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}