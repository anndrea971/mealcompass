const router = require('express').Router();
const c = require('../controllers/users');
const { idValidator, userValidators } = require('../middleware/validate');

router.get('/', c.getAll);
router.get('/:userId', idValidator('userId'), c.getOne);
router.post('/', userValidators, c.create);
router.put('/:userId', idValidator('userId'), userValidators, c.update);
router.delete('/:userId', idValidator('userId'), c.remove);

module.exports = router;
