const express = require('express');
const { body } = require('express-validator');
const {
  getTrips,
  getTrip,
  startTrip,
  endTrip,
  recordGpsPoint,
  getTripStats,
  updateTrip,
  deleteTrip,
} = require('../controllers/tripController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const upload = require('../utils/fileUpload');

const router = express.Router();

router.use(protect);

router.get('/', getTrips);
router.get('/stats/:vehicleId', getTripStats);

router.post(
  '/start',
  [
    body('vehicleId', 'Vehicle ID is required').notEmpty(),
    body('purpose', 'Purpose is required').notEmpty(),
    validate,
  ],
  startTrip
);

router.post(
  '/:id/end',
  upload.array('photos', 5), // upload up to 5 photos (receipts, scenic, bike)
  endTrip
);

router.post(
  '/:id/gps',
  [
    body('lat', 'Latitude must be a valid number').isNumeric(),
    body('lng', 'Longitude must be a valid number').isNumeric(),
    validate,
  ],
  recordGpsPoint
);

router
  .route('/:id')
  .get(getTrip)
  .put(upload.array('photos', 5), updateTrip)
  .delete(deleteTrip);

module.exports = router;
