import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const requireAuth = (req, res, next) => {
  // 1. Look for the Authorization header
  const authHeader = req.headers.authorization;
  
  // If it's missing or doesn't start with "Bearer ", block them
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 2. Extract just the token part (splitting "Bearer <token>")
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify the token cryptographically
    // If it is tampered with or expired, this will immediately throw an error
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // 4. Attach the decoded payload ({ sub, email, iat, exp }) to the request
    req.user = {
      id: decoded.sub, // 'sub' is standard JWT lingo for the user ID
      email: decoded.email
    };
    
    // 5. Let the user through to the actual route!
    next();
  } catch (error) {
    // This catches jsonwebtoken's TokenExpiredError and JsonWebTokenError
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};