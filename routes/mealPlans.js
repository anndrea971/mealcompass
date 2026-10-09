const router = require('express').Router();
const c = require('../controllers/mealPlans');
const { idValidator, mealPlanValidators } = require('../middleware/validate');
const { isAuthenticated, requireOwner } = require('../middleware/auth');

const owner = requireOwner('mealPlans', 'mealPlanId', 'userId');

// Meal plans are private: every route needs login, and single-plan routes need ownership.
router.get('/', isAuthenticated, c.getAll);
router.get('/:mealPlanId', isAuthenticated, idValidator('mealPlanId'), owner, c.getOne);
router.post('/', isAuthenticated, mealPlanValidators, c.create);
router.put('/:mealPlanId', isAuthenticated, idValidator('mealPlanId'), owner, mealPlanValidators, c.update);
router.delete('/:mealPlanId', isAuthenticated, idValidator('mealPlanId'), owner, c.remove);

module.exports = router;
