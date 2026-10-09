const router = require('express').Router();

router.get('/', (req, res) => {
  res.status(200).json({ name: 'Meal Compass API', docs: '/api-docs' });
});
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/recipes', require('./recipes'));
router.use('/meal-plans', require('./mealPlans'));
router.use('/grocery-lists', require('./groceryLists'));

module.exports = router;
