const jwt = require('jsonwebtoken');
const config = require('../config/config');
const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // 1. First, check for Better-Auth session token in cookies
    const cookieHeader = req.headers.cookie;
    let sessionToken = null;

    if (cookieHeader) {
      // Parse cookies to find better-auth session token
      // Parse cookies to find better-auth session token
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        // Handle cookies with multiple '=' characters (e.g. value contains '=')
        const parts = cookie.trim().split('=');
        const key = parts[0];
        // Join the rest back together in case the value had '='
        const value = parts.slice(1).join('=');
        acc[key] = value;
        return acc;
      }, {});

      // Better-Auth typically uses 'better-auth.session_token' as the cookie name
      let rawToken = cookies['better-auth.session_token'] || cookies['better-auth.session_token'] || cookies['session_token'] || cookies['auth_session'];

      if (rawToken) {
        // Decode URL encoded characters
        try {
          rawToken = decodeURIComponent(rawToken);
        } catch (e) {
          // Keep original if decoding fails
        }

        // If it's a signed cookie (format: token.signature), extract just the token
        // Better-Auth often signs cookies like: "token.base64signature"
        if (rawToken.includes('.')) {
          const originalToken = rawToken;
          rawToken = rawToken.split('.')[0];
          console.log(`ℹ️ Auth Middleware: Parsed signed cookie. Original: ${originalToken.substring(0, 15)}... -> Token: ${rawToken.substring(0, 15)}...`);
        }

        sessionToken = rawToken;
      }
    }

    if (sessionToken) {
      try {
        const session = await mongodbService.findSessionByToken(sessionToken);

        if (session) {
          // Check session expiry
          if (new Date() > new Date(session.expiresAt)) {
            console.log('❌ Auth Middleware: Session expired');
            return res.status(401).json(createResponse(false, 'Session expired'));
          }

          // Find user from session
          const user = await mongodbService.findSessionUser(session.userId);

          if (!user) {
            console.error('Session found but user not found:', session.userId);
            return res.status(401).json(createResponse(false, 'User no longer exists'));
          }

          if (user.isActive === false) {
            return res.status(401).json(createResponse(false, 'User account is deactivated'));
          }

          req.user = {
            userId: user.id || user._id,
            email: user.email,
            role: user.role
          };

          console.log('🔐 Authentication: User authenticated (Better-Auth Cookie Session):', {
            userId: user.id,
            email: user.email
          });

          return next();
        }
      } catch (sessionError) {
        console.error('Cookie session verification error:', sessionError);
        // Fall through to try Authorization header
      }
    }

    // 2. If no valid cookie session, check Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth Middleware: No valid session cookie and no Authorization header');
      console.log('   Cookies:', cookieHeader);
      console.log('   Auth Header:', authHeader);
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // 3. Try Legacy JWT Verification
      const decoded = jwt.verify(token, config.jwt.secret);

      // Check if user still exists
      const user = await mongodbService.findUserById(decoded.userId);
      if (!user) {
        return res.status(401).json(createResponse(false, 'User no longer exists'));
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json(createResponse(false, 'User account is deactivated'));
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      console.log('🔐 Authentication: User authenticated (JWT):', {
        userId: user.id,
        email: user.email
      });

      return next();
    } catch (jwtError) {
      // 4. If JWT fails, try Bearer token as Better-Auth Session
      try {
        const session = await mongodbService.findSessionByToken(token);

        if (session) {
          if (new Date() > new Date(session.expiresAt)) {
            return res.status(401).json(createResponse(false, 'Session expired'));
          }

          const user = await mongodbService.findSessionUser(session.userId);

          if (!user) {
            console.error('Session found but user not found:', session.userId);
            return res.status(401).json(createResponse(false, 'User no longer exists'));
          }

          if (user.isActive === false) {
            return res.status(401).json(createResponse(false, 'User account is deactivated'));
          }

          req.user = {
            userId: user.id || user._id,
            email: user.email,
            role: user.role
          };

          console.log('🔐 Authentication: User authenticated (Better-Auth Bearer Session):', {
            userId: user.id,
            email: user.email
          });

          return next();
        }
      } catch (sessionError) {
        console.error('Bearer session verification error:', sessionError);
      }

      // Return original JWT error if all methods failed
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json(createResponse(false, 'Token expired'));
      }
      return res.status(401).json(createResponse(false, 'Invalid token'));
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json(createResponse(false, 'Authentication error'));
  }
};

// Authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json(createResponse(false, 'Insufficient permissions'));
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      // 1. Try JWT
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await mongodbService.findUserById(decoded.userId);

      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role
        };
      }
    } catch (jwtError) {
      // 2. Try Session
      try {
        const session = await mongodbService.findSessionByToken(token);

        if (session && new Date() <= new Date(session.expiresAt)) {
          const user = await mongodbService.findSessionUser(session.userId);

          if (user && user.isActive !== false) {
            req.user = {
              userId: user.id || user._id,
              email: user.email,
              role: user.role
            };
          }
        }
      } catch (sessionError) {
        // Ignore session errors in optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
