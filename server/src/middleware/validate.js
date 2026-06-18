export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    // Flatten the Zod error to get a clean object mapping fields to their specific errors
    res.status(400).json({ 
      error: "Validation failed", 
      details: error.flatten().fieldErrors 
    });
  }
};