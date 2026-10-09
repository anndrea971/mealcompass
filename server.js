require('dotenv').config();
const createApp = require('./app');
const { connectDb } = require('./config/db');

const port = process.env.PORT || 3000;

connectDb()
  .then(() => {
    const app = createApp();
    app.listen(port, () => console.log(`Meal Compass running on port ${port}`));
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
