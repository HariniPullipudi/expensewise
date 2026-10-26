const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const requireAuth = require('../middleware/requireAuth');
const {
  validateObjectId,
  validateTransactionInput
} = require('../middleware/validateRequest');

// All transaction routes require authentication
router.use(requireAuth);

router.get('/', transactionController.getTransactions);
router.get('/:id', validateObjectId('id'), transactionController.getTransactionById);
router.post('/', validateTransactionInput, transactionController.createTransaction);
router.put('/:id', validateObjectId('id'), validateTransactionInput, transactionController.updateTransaction);
router.delete('/:id', validateObjectId('id'), transactionController.deleteTransaction);

module.exports = router;
