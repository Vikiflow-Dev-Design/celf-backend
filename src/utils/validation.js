/**
 * Backend Validation Utilities
 * Comprehensive validation functions for authentication and forms
 */

/**
 * Email validation using regex
 */
const validateEmail = (email) => {
  const errors = [];
  
  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please enter a valid email address');
    }
    
    // Additional email checks
    if (email.trim().length > 254) {
      errors.push('Email address is too long');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Password validation with comprehensive rules
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long (maximum 128 characters)');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'abc123456', 'password123',
    'admin123', 'letmein123', 'welcome123', 'monkey123', '123456789'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more secure password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Name validation (firstName, lastName)
 */
const validateName = (name, fieldName) => {
  const errors = [];
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push(`${fieldName} is required`);
  } else {
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      errors.push(`${fieldName} must be at least 2 characters long`);
    }
    
    if (trimmedName.length > 50) {
      errors.push(`${fieldName} must be less than 50 characters long`);
    }
    
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
    }
    
    // Check for suspicious patterns
    if (/(.)\1{4,}/.test(trimmedName)) {
      errors.push(`${fieldName} contains too many repeated characters`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Login form validation
 */
const validateLoginForm = (email, password) => {
  const errors = [];
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }
  
  // Password required check (not full validation for login)
  if (!password || typeof password !== 'string' || !password.trim()) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Registration form validation
 */
const validateRegistrationForm = (firstName, lastName, email, password) => {
  const errors = [];
  
  // First name validation
  const firstNameValidation = validateName(firstName, 'First name');
  if (!firstNameValidation.isValid) {
    errors.push(...firstNameValidation.errors);
  }
  
  // Last name validation
  const lastNameValidation = validateName(lastName, 'Last name');
  if (!lastNameValidation.isValid) {
    errors.push(...lastNameValidation.errors);
  }
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }
  
  // Password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

/**
 * Sanitize user registration data
 */
const sanitizeRegistrationData = (data) => {
  return {
    firstName: sanitizeInput(data.firstName),
    lastName: sanitizeInput(data.lastName),
    email: sanitizeInput(data.email)?.toLowerCase(),
    password: data.password // Don't sanitize password, just validate
  };
};

/**
 * Sanitize user login data
 */
const sanitizeLoginData = (data) => {
  return {
    email: sanitizeInput(data.email)?.toLowerCase(),
    password: data.password // Don't sanitize password
  };
};

/**
 * Check for SQL injection patterns (basic protection)
 */
const checkForSQLInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|")/,
    /(\bOR\b|\bAND\b).*[=<>]/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Rate limiting validation
 */
const validateRateLimit = (attempts, maxAttempts = 5, timeWindow = 15 * 60 * 1000) => {
  // This would typically work with Redis or in-memory store
  // For now, just return structure
  return {
    isAllowed: attempts < maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - attempts),
    resetTime: Date.now() + timeWindow
  };
};

/**
 * Format validation errors for API response
 */
const formatValidationErrors = (errors) => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Validation failed';
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return `Validation failed: ${errors.join('; ')}`;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateLoginForm,
  validateRegistrationForm,
  sanitizeInput,
  sanitizeRegistrationData,
  sanitizeLoginData,
  checkForSQLInjection,
  validateRateLimit,
  formatValidationErrors
};
