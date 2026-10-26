const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/summary', dashboardController.getSummary);
router.get('/charts', dashboardController.getCharts);

module.exports = router;
