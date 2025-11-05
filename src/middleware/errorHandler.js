import logger from '../utils/logger.js';
import { errorResponse } from '../utils/helpers.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });

  // Database errors
  if (err.code === '23505') {
    return errorResponse(res, 'Duplicate entry found', 409, { detail: err.detail });
  }

  if (err.code === '23503') {
    return errorResponse(res, 'Referenced record not found', 404, { detail: err.detail });
  }

  if (err.code === '22P02') {
    return errorResponse(res, 'Invalid data type', 400, { detail: err.detail });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return errorResponse(res, message, statusCode, err.errors);
};

export const notFoundHandler = (req, res, next) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

export default {
  errorHandler,
  notFoundHandler
};