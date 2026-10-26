const dashboardService = require('../services/dashboardService');

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const summaryData = await dashboardService.getDashboardSummary(
      req.user._id,
      period,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: summaryData
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/charts
const getCharts = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const chartsData = await dashboardService.getDashboardCharts(
      req.user._id,
      period,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: chartsData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getCharts
};
