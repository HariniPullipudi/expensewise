const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const dbStore = require('../services/dbStore');

const isMongo = () => mongoose.connection.readyState === 1;

// GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const {
      search,
      type,
      category,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    if (isMongo()) {
      const query = { user: req.user._id };

      if (search && search.trim()) {
        const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { title: { $regex: escapedSearch, $options: 'i' } },
          { notes: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      if (type && ['income', 'expense'].includes(type.toLowerCase())) {
        query.type = type.toLowerCase();
      }

      if (category && category.trim() && category !== 'All' && category !== 'all') {
        query.category = category.trim();
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query.date.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const allowedSortFields = ['date', 'amount', 'title'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'date';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      const sort = { [sortField]: sortDirection };
      if (sortField !== 'date') sort.date = -1;

      const [transactions, totalCount] = await Promise.all([
        Transaction.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
        Transaction.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limitNum) || 1;

      return res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            totalCount,
            totalPages,
            currentPage: pageNum,
            limit: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          }
        }
      });
    }

    // Fallback using dbStore
    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (category && category !== 'all') filter.category = category;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    if (search) filter.search = search;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const { transactions, totalCount } = await dbStore.getTransactions(
      req.user._id,
      filter,
      sort,
      skip,
      limitNum
    );

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res, next) => {
  try {
    let transaction;
    if (isMongo()) {
      transaction = await Transaction.findOne({
        _id: req.params.id,
        user: req.user._id
      });
    } else {
      transaction = await dbStore.findTransactionById(req.params.id, req.user._id);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or you do not have permission to access it.'
      });
    }

    res.status(200).json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/transactions
const createTransaction = async (req, res, next) => {
  try {
    const { title, type, amount, category, date, paymentMethod, notes } = req.body;

    let transaction;
    if (isMongo()) {
      transaction = await Transaction.create({
        user: req.user._id,
        title,
        type,
        amount,
        category,
        date: date || new Date(),
        paymentMethod: paymentMethod || 'UPI',
        notes: notes ? notes.trim() : ''
      });
    } else {
      transaction = await dbStore.createTransaction({
        user: req.user._id,
        title,
        type,
        amount,
        category,
        date: date || new Date(),
        paymentMethod: paymentMethod || 'UPI',
        notes: notes ? notes.trim() : ''
      });
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res, next) => {
  try {
    const { title, type, amount, category, date, paymentMethod, notes } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = amount;
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (notes !== undefined) updates.notes = notes.trim();

    let transaction;
    if (isMongo()) {
      transaction = await Transaction.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        updates,
        { new: true, runValidators: true }
      );
    } else {
      transaction = await dbStore.updateTransaction(req.params.id, req.user._id, updates);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or you do not have permission to modify it.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    let success = false;
    if (isMongo()) {
      const deleted = await Transaction.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
      });
      success = !!deleted;
    } else {
      success = await dbStore.deleteTransaction(req.params.id, req.user._id);
    }

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or you do not have permission to delete it.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
