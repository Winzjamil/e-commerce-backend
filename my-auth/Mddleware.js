import jwt from 'jsonwebtoken';
const SECRET_KEY = process.env.TOKEN_SECRET;

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Unauthorized. Token missing.' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('JWT VERIFY FAILED', err.message);
    return res
      .status(404)
      .json({ message: 'Invalid or expired token.' || err.message });
  }
};
