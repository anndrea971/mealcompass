const router = require('express').Router();
const c = require('../controllers/recipes');
const { idValidator, recipeValidators } = require('../middleware/validate');
const { isAuthenticated, requireOwner } = require('../middleware/auth');

const owner = requireOwner('recipes', 'recipeId', 'createdBy');

// Reading recipes is public; changing them requires login (and ownership for PUT/DELETE).
router.get('/', c.getAll);
router.get('/:recipeId', idValidator('recipeId'), c.getOne);
router.post('/', isAuthenticated, recipeValidators, c.create);
router.put('/:recipeId', isAuthenticated, idValidator('recipeId'), owner, recipeValidators, c.update);
router.delete('/:recipeId', isAuthenticated, idValidator('recipeId'), owner, c.remove);

module.exports = router;
