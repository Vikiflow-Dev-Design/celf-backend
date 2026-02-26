/**
 * Create a standardized API response
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - Response message
 * @param {any} data - Response data (optional)
 * @param {any} meta - Additional metadata (optional)
 * @returns {object} Standardized response object
 */
const createResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Create a paginated response
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - Response message
 * @param {any} data - Response data
 * @param {object} pagination - Pagination info
 * @returns {object} Paginated response object
 */
const createPaginatedResponse = (success, message, data, pagination) => {
  return createResponse(success, message, data, { pagination });
};

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {any} errors - Error details (optional)
 * @param {number} code - Error code (optional)
 * @returns {object} Error response object
 */
const createErrorResponse = (message, errors = null, code = null) => {
  const meta = {};
  
  if (errors !== null) {
    meta.errors = errors;
  }
  
  if (code !== null) {
    meta.code = code;
  }

  return createResponse(false, message, null, Object.keys(meta).length > 0 ? meta : null);
};

/**
 * Create a success response
 * @param {string} message - Success message
 * @param {any} data - Response data (optional)
 * @returns {object} Success response object
 */
const createSuccessResponse = (message, data = null) => {
  return createResponse(true, message, data);
};

module.exports = {
  createResponse,
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse
};
