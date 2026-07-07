const express = require('express');
const { body } = require('express-validator');
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const upload = require('../utils/fileUpload');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getServices)
  .post(
    upload.single('invoicePhoto'),
    [
      body('vehicleId', 'Vehicle ID is required').notEmpty(),
      body('odometer', 'Odometer must be a number').isNumeric(),
      body('type', 'Service Type is required').isIn([
        'Oil Change',
        'Chain Lube',
        'Tyres',
        'Battery',
        'Brake Pad',
        'General Service',
        'Other',
      ]),
      validate,
    ],
    createService
  );

router
  .route('/:id')
  .get(getService)
  .put(upload.single('invoicePhoto'), updateService)
  .delete(deleteService);

module.exports = router;
