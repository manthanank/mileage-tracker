const express = require('express');
const { body } = require('express-validator');
const {
  getFuelEntries,
  createFuelEntry,
  updateFuelEntry,
  deleteFuelEntry,
} = require('../controllers/fuelController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const upload = require('../utils/fileUpload');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getFuelEntries)
  .post(
    upload.single('receiptPhoto'),
    [
      body('vehicleId', 'Vehicle ID is required').notEmpty(),
      body('odometer', 'Odometer must be a positive number').isNumeric(),
      body('liters', 'Liters must be a positive number').isFloat({ min: 0.1 }),
      body('pricePerLiter', 'Price per liter must be a positive number').isFloat({ min: 0.1 }),
      body('totalCost', 'Total cost must be a positive number').isFloat({ min: 0.1 }),
      validate,
    ],
    createFuelEntry
  );

router
  .route('/:id')
  .put(upload.single('receiptPhoto'), updateFuelEntry)
  .delete(deleteFuelEntry);

module.exports = router;
