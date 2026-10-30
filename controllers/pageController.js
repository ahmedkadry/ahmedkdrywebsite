const db = require('../db');

exports.home = (req, res) => {
    res.render('index', { title: 'EduFlow — Student Management' });
};

exports.loginPage = (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('auth', { title: 'Sign in', mode: 'login', error: null });
};

exports.registerPage = (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('auth', { title: 'Create account', mode: 'register', error: null });
};

exports.dashboard = (req, res) => {
    const user = req.user;
    const view = { title: 'Dashboard', students: [], stats: null, ownProfile: null };

    if (user.role === 'admin' || user.role === 'teacher') {
        view.students = db.prepare(`
      SELECT s.*, u.name AS account_name
      FROM students s LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC LIMIT 20
    `).all();

        view.stats = {
            total: db.prepare('SELECT COUNT(*) AS n FROM students').get().n,
            active: db.prepare("SELECT COUNT(*) AS n FROM students WHERE status='active'").get().n,
            courses: db.prepare('SELECT COUNT(*) AS n FROM courses').get().n,
        };
    } else {
        view.ownProfile = db
            .prepare('SELECT * FROM students WHERE user_id=?')
            .get(user.id) || null;
    }

    res.render('dashboard', view);
};

exports.teacherDashboard = (req, res) => {
    const user = req.user;
    const courses = db.prepare(`
    SELECT c.*, u.name AS teacher_name
    FROM courses c LEFT JOIN users u ON u.id = c.teacher_id
    WHERE c.teacher_id = ?
    ORDER BY c.code
  `).all(user.id);

    const students = db.prepare(`
    SELECT * FROM students ORDER BY first_name, last_name LIMIT 100
  `).all();
    const stats = {
        myCourses: courses.length,
        totalStudents: db.prepare('SELECT COUNT(*) AS n FROM students').get().n,
        activeStudents: db.prepare("SELECT COUNT(*) AS n FROM students WHERE status='active'").get().n,
    };

    res.render('teacher', { title: 'Teacher Dashboard', courses, students, stats });
};