const router = require('express').Router();

router.get('/', (req, res) => {
  res.status(200).json({ name: 'Meal Compass API', docs: '/api-docs' });
});
router.use('/users', require('./users'));
router.use('/recipes', require('./recipes'));

module.exports = router;
