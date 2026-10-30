const router = require('express').Router();
const c = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/me', authorize('student'), c.me);
router.get('/', authorize('admin', 'teacher'), c.list);
router.get('/:id', authorize('admin', 'teacher', 'student'), c.get);
router.post('/', authorize('admin'), c.create);
router.put('/:id', authorize('admin'), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;