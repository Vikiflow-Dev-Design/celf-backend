const { createResponse } = require('../utils/responseUtils');

/**
 * Validates req.body against a Zod schema.
 * Replaces the parsed data back on req.body (sanitized).
 * Usage: router.post('/route', validate(mySchema), controller)
 */
const validate = (schema) => (req, res, next) => {
  console.log('🔍 Zod validation - Request body:', JSON.stringify(req.body, null, 2));

  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    console.log('❌ Zod validation errors:', errors);

    return res.status(400).json(
      createResponse(false, 'Validation failed', null, { errors })
    );
  }

  // Replace req.body with sanitized/coerced data from Zod
  req.body = result.data;
  console.log('✅ Zod validation passed');
  next();
};

/**
 * Validates req.query against a Zod schema.
 * Usage: router.get('/route', validateQuery(mySchema), controller)
 */
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json(
      createResponse(false, 'Validation failed', null, { errors })
    );
  }

  req.query = result.data;
  next();
};

/**
 * Validates req.params against a Zod schema.
 * Usage: router.get('/:id', validateParams(mySchema), controller)
 */
const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json(
      createResponse(false, 'Validation failed', null, { errors })
    );
  }

  req.params = result.data;
  next();
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
};
