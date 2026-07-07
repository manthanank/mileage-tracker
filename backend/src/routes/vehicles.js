const express = require('express');
const { body } = require('express-validator');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDashboard,
} = require('../controllers/vehicleController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router
  .route('/')
  .get(getVehicles)
  .post(
    [
      body('name', 'Name is required').notEmpty().trim(),
      body('type', 'Valid type (bike, car, scooter, other) is required').isIn(['bike', 'car', 'scooter', 'other']),
      body('brand', 'Brand is required').notEmpty().trim(),
      body('model', 'Model is required').notEmpty().trim(),
      body('year', 'Manufacturing year is required').isNumeric(),
      body('fuelType', 'Valid fuel type (petrol, diesel, electric, CNG) is required').isIn(['petrol', 'diesel', 'electric', 'CNG']),
      body('startOdometer', 'Start odometer is required and must be a number').isNumeric(),
      validate,
    ],
    createVehicle
  );

router
  .route('/:id')
  .get(getVehicle)
  .put(updateVehicle)
  .delete(deleteVehicle);

router.get('/:id/dashboard', getVehicleDashboard);

module.exports = router;
