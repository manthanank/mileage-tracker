const express = require('express');
const {
  getMonthlySummary,
  getAnnualSummary,
  downloadReport,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/monthly/:vehicleId', getMonthlySummary);
router.get('/annual/:vehicleId', getAnnualSummary);
router.get('/report/download', downloadReport);

module.exports = router;
