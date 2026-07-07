const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Log detailed error stack trace during development
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  } else {
    // If a database crash or code bug occurs in production, hide stack descriptions
    if (!err.isOperational) {
      statusCode = 500;
      message = 'Something went wrong on the server';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
