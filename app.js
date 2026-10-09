const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// `setupAuth: false` and `beforeRoutes` exist so tests can fake a logged-in user.
function createApp({ setupAuth = true, beforeRoutes = [] } = {}) {
  const app = express();

  app.set('trust proxy', 1); // Render terminates HTTPS in front of the app
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  if (setupAuth) require('./config/passport').setupAuth(app);
  beforeRoutes.forEach((m) => app.use(m));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/', require('./routes'));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
