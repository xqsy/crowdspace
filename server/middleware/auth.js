/**
 * Authentication middleware for admin routes
 */

// Check if user is authenticated as admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
}

// Check admin status without blocking (for conditional UI)
function checkAdmin(req, res, next) {
  req.isAdmin = !!(req.session && req.session.isAdmin);
  next();
}

module.exports = {
  requireAdmin,
  checkAdmin,
};
