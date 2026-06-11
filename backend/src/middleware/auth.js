const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'missing token' });
  }

  const parts = auth.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'invalid token' });
  }

  const token = parts[1];

  // Dev bypass for development ONLY
  if (process.env.NODE_ENV === 'development' && token === 'dev-bypass-token') {
    console.warn('Auth Middleware - WARNING: Using dev bypass token');
    req.user = { id: 1, name: 'Dev User', email: 'dev@local', role: 'admin' };
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
};
