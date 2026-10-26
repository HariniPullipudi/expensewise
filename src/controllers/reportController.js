const reportService = require('../services/reportService');
const { generateTransactionsCsv } = require('../utils/csv');

// GET /api/reports/summary
const getSummary = async (req, res, next) => {
  try {
    const reportData = await reportService.getReportSummary(req.user._id, req.query);
    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/export.csv
const exportCsv = async (req, res, next) => {
  try {
    const reportData = await reportService.getReportSummary(req.user._id, req.query);
    const csvContent = generateTransactionsCsv(reportData.transactions);

    const today = new Date().toISOString().split('T')[0];
    const filename = `expensewise-transactions-${today}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  exportCsv
};
