const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const requireAuth = require('../middleware/requireAuth');
const {
  validateObjectId,
  validateBudgetInput
} = require('../middleware/validateRequest');

// All budget routes require authentication
router.use(requireAuth);

router.get('/', budgetController.getBudgets);
router.get('/:id', validateObjectId('id'), budgetController.getBudgetById);
router.post('/', validateBudgetInput, budgetController.createBudget);
router.put('/:id', validateObjectId('id'), budgetController.updateBudget);
router.delete('/:id', validateObjectId('id'), budgetController.deleteBudget);

module.exports = router;
