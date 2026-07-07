const express = require('express');
const { body } = require('express-validator');
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const upload = require('../utils/fileUpload');

const router = express.Router();

router.use(protect);

router.get('/summary/:vehicleId', getExpenseSummary);

router
  .route('/')
  .get(getExpenses)
  .post(
    upload.single('receiptPhoto'),
    [
      body('vehicleId', 'Vehicle ID is required').notEmpty(),
      body('category', 'Category is required').notEmpty(),
      body('amount', 'Amount must be a positive number').isFloat({ min: 0.1 }),
      validate,
    ],
    createExpense
  );

router
  .route('/:id')
  .get(getExpense)
  .put(upload.single('receiptPhoto'), updateExpense)
  .delete(deleteExpense);

module.exports = router;
