// middleware/auth.js
require('dotenv').config();

exports.authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  
    const token = authHeader.split(' ')[1];
    if (token !== process.env.QUIDAX_API_SECRET)
      return res.status(403).json({ message: 'Invalid token' });
  
    next();
  };
  
  