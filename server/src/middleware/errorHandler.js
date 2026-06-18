import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error isn't one of our custom ApiErrors, convert it into a 500 error
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Something went wrong';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // 500s log the full stack trace to the server console so you can debug
  if (error.statusCode === 500) {
    console.error(`[SERVER CRASH] ${error.message}\nStack: ${error.stack}`);
  }

  // Send the response back to the client
  res.status(error.statusCode).json({
    // If it's a 500, hide the real error message from the client for security
    error: error.statusCode === 500 ? 'Internal server error' : error.message,
    
    // Only include the stack trace in the API response if we are in development mode
    ...(env.NODE_ENV === 'development' && { stack: error.stack })
  });
};