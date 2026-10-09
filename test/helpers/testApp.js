const request = require('supertest');
const createApp = require('../../app');

// Fakes login: send the header `x-test-user: <json user>` to act as that user.
const fakeLogin = (req, res, next) => {
  const raw = req.headers['x-test-user'];
  if (raw) req.user = JSON.parse(raw);
  req.isAuthenticated = () => !!req.user;
  next();
};

const app = createApp({ setupAuth: false, beforeRoutes: [fakeLogin] });
const as = (user) => JSON.stringify(user);

module.exports = { api: () => request(app), as };
