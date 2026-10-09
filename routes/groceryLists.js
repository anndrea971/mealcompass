const router = require('express').Router();
const c = require('../controllers/groceryLists');
const { idValidator, groceryListValidators } = require('../middleware/validate');
const { isAuthenticated, requireOwner } = require('../middleware/auth');

const owner = requireOwner('groceryLists', 'groceryListId', 'userId');

router.get('/', isAuthenticated, c.getAll);
router.get('/:groceryListId', isAuthenticated, idValidator('groceryListId'), owner, c.getOne);
router.post('/', isAuthenticated, groceryListValidators, c.create);
router.put('/:groceryListId', isAuthenticated, idValidator('groceryListId'), owner, groceryListValidators, c.update);
router.delete('/:groceryListId', isAuthenticated, idValidator('groceryListId'), owner, c.remove);

module.exports = router;
