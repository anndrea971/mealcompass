const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');

const isAdmin = (user) => user && user.role === 'admin';

// 401 when nobody is logged in.
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Authentication required. Log in at /auth/github' });
}

// 403 unless the logged-in user is an admin.
const requireAdmin = [
  isAuthenticated,
  (req, res, next) =>
    isAdmin(req.user) ? next() : res.status(403).json({ error: 'Admin access required' })
];

// 403 unless the :param id is the logged-in user (or the user is an admin).
const requireSelfOrAdmin = (param) => (req, res, next) =>
  isAdmin(req.user) || String(req.user._id) === req.params[param]
    ? next()
    : res.status(403).json({ error: 'You can only access your own account' });

// 404 if the document doesn't exist, 403 unless the user owns it (or is an admin).
const requireOwner = (collection, param, ownerField) => async (req, res, next) => {
  try {
    const doc = await getDb().collection(collection).findOne({ _id: new ObjectId(req.params[param]) });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const owns = doc[ownerField] && String(doc[ownerField]) === String(req.user._id);
    if (isAdmin(req.user) || owns) return next();
    return res.status(403).json({ error: 'You can only access your own data' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to check permissions' });
  }
};

module.exports = { isAdmin, isAuthenticated, requireAdmin, requireSelfOrAdmin, requireOwner };
