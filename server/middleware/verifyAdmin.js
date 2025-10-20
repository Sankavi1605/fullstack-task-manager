// server/middleware/verifyAdmin.js

module.exports = function (req, res, next) {
  // This middleware should run AFTER verifyToken,
  // so we will have access to req.user

  if (!req.user || req.user.role !== 'ADMIN') {
    // 403 Forbidden
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }

  // If we're here, the user is an admin
  next();
};