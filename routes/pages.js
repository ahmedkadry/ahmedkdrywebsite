const router = require('express').Router();
const page = require('../controllers/pageController');
const auth = require('../controllers/authController');
const { requirePage, requireRole } = require('../middleware/auth');

// Public pages
router.get('/', page.home);
router.get('/login', page.loginPage);
router.get('/register', page.registerPage);

// Form submissions (HTML) — same controller, HTML branch
router.post('/login', auth.login);
router.post('/register', auth.register);
router.post('/logout', auth.logout);

// Authenticated page
router.get('/dashboard', requirePage, page.dashboard);
router.get('/dashboard', requirePage, page.dashboard);
router.get('/teacher', requireRole('teacher'), page.teacherDashboard);

module.exports = router;