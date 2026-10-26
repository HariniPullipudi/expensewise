const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const dbStore = require('../services/dbStore');

const isMongo = () => mongoose.connection.readyState === 1;

const getMonthDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

// GET /api/budgets
const getBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const { startDate, endDate } = getMonthDateRange(month, year);

    let budgets = [];
    let spendingMap = {};

    if (isMongo()) {
      budgets = await Budget.find({ user: req.user._id, month, year }).sort({ category: 1 }).lean();

      const expenseAgg = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'expense',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            totalSpent: { $sum: '$amount' }
          }
        }
      ]);

      expenseAgg.forEach((item) => {
        spendingMap[item._id] = Math.round(item.totalSpent * 100) / 100;
      });
    } else {
      budgets = await dbStore.getBudgets(req.user._id, month, year);
      const { transactions } = await dbStore.getTransactions(req.user._id, {
        type: 'expense',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }, {}, 0, 10000);

      transactions.forEach((tx) => {
        spendingMap[tx.category] = (spendingMap[tx.category] || 0) + Number(tx.amount || 0);
      });
    }

    let totalBudgeted = 0;
    let totalSpentInBudgets = 0;

    const enrichedBudgets = budgets.map((b) => {
      const spent = Math.round((spendingMap[b.category] || 0) * 100) / 100;
      const remaining = Math.round((b.amount - spent) * 100) / 100;
      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 1000) / 10 : 0;

      totalBudgeted += b.amount;
      totalSpentInBudgets += spent;

      let status = 'ok';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 80) status = 'warning';

      return {
        ...b,
        spent,
        remaining,
        percentage,
        status
      };
    });

    const overallPercentage = totalBudgeted > 0
      ? Math.round((totalSpentInBudgets / totalBudgeted) * 1000) / 10
      : 0;

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        summary: {
          totalBudgeted: Math.round(totalBudgeted * 100) / 100,
          totalSpent: Math.round(totalSpentInBudgets * 100) / 100,
          remaining: Math.round((totalBudgeted - totalSpentInBudgets) * 100) / 100,
          overallPercentage
        },
        budgets: enrichedBudgets
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/budgets/:id
const getBudgetById = async (req, res, next) => {
  try {
    let budget;
    if (isMongo()) {
      budget = await Budget.findOne({ _id: req.params.id, user: req.user._id }).lean();
    } else {
      budget = await dbStore.findBudgetById(req.params.id, req.user._id);
    }

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const { startDate, endDate } = getMonthDateRange(budget.month, budget.year);
    let spent = 0;

    if (isMongo()) {
      const spending = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'expense',
            category: budget.category,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
      ]);
      spent = spending.length > 0 ? Math.round(spending[0].totalSpent * 100) / 100 : 0;
    } else {
      const { transactions } = await dbStore.getTransactions(req.user._id, {
        type: 'expense',
        category: budget.category,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }, {}, 0, 10000);
      spent = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    }

    const remaining = Math.round((budget.amount - spent) * 100) / 100;
    const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 1000) / 10 : 0;

    res.status(200).json({
      success: true,
      data: {
        budget: {
          ...budget,
          spent,
          remaining,
          percentage,
          status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/budgets
const createBudget = async (req, res, next) => {
  try {
    const { category, amount, month, year, description } = req.body;

    let existing;
    if (isMongo()) {
      existing = await Budget.findOne({ user: req.user._id, category, month, year });
    } else {
      existing = await dbStore.findExistingBudget(req.user._id, category, month, year);
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A budget for category '${category}' already exists for ${month}/${year}. Please edit the existing budget.`
      });
    }

    let budget;
    if (isMongo()) {
      budget = await Budget.create({
        user: req.user._id,
        category,
        amount,
        month,
        year,
        description: description ? description.trim() : ''
      });
    } else {
      budget = await dbStore.createBudget({
        user: req.user._id,
        category,
        amount,
        month,
        year,
        description: description ? description.trim() : ''
      });
    }

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: { budget }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/budgets/:id
const updateBudget = async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (description !== undefined) updates.description = description.trim();

    let budget;
    if (isMongo()) {
      budget = await Budget.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        updates,
        { new: true, runValidators: true }
      );
    } else {
      budget = await dbStore.updateBudget(req.params.id, req.user._id, updates);
    }

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully',
      data: { budget }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/budgets/:id
const deleteBudget = async (req, res, next) => {
  try {
    let success = false;
    if (isMongo()) {
      const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      success = !!deleted;
    } else {
      success = await dbStore.deleteBudget(req.params.id, req.user._id);
    }

    if (!success) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget
};
