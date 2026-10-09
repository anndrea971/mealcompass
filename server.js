require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { connectDb } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/', require('./routes'));
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

if (require.main === module) {
  connectDb()
    .then(() => app.listen(port, () => console.log(`Meal Compass running on port ${port}`)))
    .catch((err) => {
      console.error('Failed to start:', err.message);
      process.exit(1);
    });
}

module.exports = app;
