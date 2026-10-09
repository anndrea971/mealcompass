const router = require('express').Router();
const c = require('../controllers/recipes');
const { idValidator, recipeValidators } = require('../middleware/validate');

router.get('/', c.getAll);
router.get('/:recipeId', idValidator('recipeId'), c.getOne);
router.post('/', recipeValidators, c.create);
router.put('/:recipeId', idValidator('recipeId'), recipeValidators, c.update);
router.delete('/:recipeId', idValidator('recipeId'), c.remove);

module.exports = router;
