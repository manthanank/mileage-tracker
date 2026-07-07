const express = require('express');
const { body } = require('express-validator');
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const upload = require('../utils/fileUpload');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getDocuments)
  .post(
    upload.single('document'),
    [
      body('vehicleId', 'Vehicle ID is required').notEmpty(),
      body('name', 'Document name is required').notEmpty().trim(),
      body('type', 'Valid document type is required').isIn([
        'RC',
        'Insurance',
        'PUC',
        'License',
        'Purchase Invoice',
        'Warranty',
        'Other',
      ]),
      validate,
    ],
    createDocument
  );

router
  .route('/:id')
  .get(getDocument)
  .put(upload.single('document'), updateDocument)
  .delete(deleteDocument);

module.exports = router;
