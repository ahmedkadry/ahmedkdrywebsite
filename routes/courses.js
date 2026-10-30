const router = require('express').Router();
const c = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', c.list);
router.get('/mine', c.listMine);                       // ← MUST be before /:id
router.get('/:id', c.get);

router.post('/', authorize('admin'), c.create);
router.put('/:id', authorize('admin'), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;