const router = require('express').Router();
const passport = require('passport');
const { isAuthenticated } = require('../middleware/auth');

// Starts the GitHub login (full-page redirect to GitHub).
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub sends the user back here; on success a session is created.
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/failure' }),
  (req, res) => res.redirect('/auth/me')
);

router.get('/failure', (req, res) => res.status(401).json({ error: 'GitHub login failed' }));

// Who am I? 200 with the user when logged in, 401 otherwise.
router.get('/me', isAuthenticated, (req, res) => res.status(200).json(req.user));

router.get('/logout', (req, res) => {
  const finish = (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logged out' });
  };
  if (!req.logout) return finish();
  req.logout((err) => {
    if (err) return finish(err);
    if (req.session) return req.session.destroy(finish);
    return finish();
  });
});

module.exports = router;
