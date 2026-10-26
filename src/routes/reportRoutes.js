const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/summary', reportController.getSummary);
router.get('/export.csv', reportController.exportCsv);

module.exports = router;
