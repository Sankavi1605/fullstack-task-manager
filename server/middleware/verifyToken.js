// server/middleware/verifyToken.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Get the token from the header
  // The frontend will send this on 'x-auth-token'
  const token = req.header('x-auth-token');

  // 2. Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied.' });
  }

  // 3. Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Add the user payload from the token to the request object
    // Now all our protected routes will have access to req.user
    req.user = decoded.user;

    // 5. Call the next middleware or route
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};