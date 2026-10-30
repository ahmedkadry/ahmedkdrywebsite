const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';

function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Runs on every request → populates req.user + res.locals.user
function loadUser(req, res, next) {
    const token =
        req.cookies?.token ||
        (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token) {
        try { req.user = jwt.verify(token, JWT_SECRET); }
        catch { res.clearCookie('token'); }
    }
    res.locals.user = req.user || null;
    next();
}

// JSON-friendly auth (for API routes)
function authenticate(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    next();
}

// Redirect-friendly auth (for EJS page routes)
function requirePage(req, res, next) {
    if (!req.user) return res.redirect('/login');
    next();
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role))
            return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}

function cookieOpts() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.redirect('/login');
        if (!roles.includes(req.user.role)) return res.redirect('/dashboard');
        next();
    };
}

module.exports = {
    signToken, loadUser, authenticate, requirePage, authorize, cookieOpts, requireRole,
};