const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const { Strategy: GitHubStrategy } = require('passport-github2');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

// Finds or creates the user for a GitHub profile and records the login time.
async function findOrCreateUser(profile) {
  const users = getDb().collection('users');
  const username = profile.username;
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
  const now = new Date();

  const set = { username, displayName: profile.displayName || username, avatarUrl, lastLoginAt: now };
  if (email) set.email = email;
  const setOnInsert = { githubId: String(profile.id), createdAt: now };
  if (!email) setOnInsert.email = null;

  // ADMIN_GITHUB_USERNAME (optional) is automatically made an admin on login.
  const adminName = (process.env.ADMIN_GITHUB_USERNAME || '').toLowerCase();
  if (adminName && username && username.toLowerCase() === adminName) set.role = 'admin';
  else setOnInsert.role = 'user';

  return users.findOneAndUpdate(
    { githubId: String(profile.id) },
    { $set: set, $setOnInsert: setOnInsert },
    { upsert: true, returnDocument: 'after' }
  );
}

function setupAuth(app) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const production = process.env.NODE_ENV === 'production';

  app.use(
    session({
      secret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.DB_NAME || 'meal_compass'
      }),
      cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }
    })
  );

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          done(null, await findOrCreateUser(profile));
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, String(user._id)));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getDb().collection('users').findOne({ _id: new ObjectId(id) });
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

module.exports = { setupAuth, findOrCreateUser };
