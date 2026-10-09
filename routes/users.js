const router = require('express').Router();
const c = require('../controllers/users');
const { idValidator, userValidators } = require('../middleware/validate');
const { isAuthenticated, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');

// Profiles contain personal data: list = admin only, single = the user themself or an admin.
router.get('/', requireAdmin, c.getAll);
router.get('/:userId', isAuthenticated, idValidator('userId'), requireSelfOrAdmin('userId'), c.getOne);
router.post('/', requireAdmin, userValidators, c.create);
router.put('/:userId', isAuthenticated, idValidator('userId'), requireSelfOrAdmin('userId'), userValidators, c.update);
router.delete('/:userId', isAuthenticated, idValidator('userId'), requireSelfOrAdmin('userId'), c.remove);

module.exports = router;
