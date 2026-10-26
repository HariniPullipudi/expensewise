const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const dbStore = require('./dbStore');

const isMongo = () => mongoose.connection.readyState === 1;

const getReportSummary = async (userId, filters = {}) => {
  const { startDate, endDate, category, type } = filters;

  if (isMongo()) {
    const matchQuery = { user: userId };

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        matchQuery.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchQuery.date.$lte = e;
      }
    }

    if (category && category !== 'All' && category !== 'all') {
      matchQuery.category = category;
    }

    if (type && ['income', 'expense'].includes(type.toLowerCase())) {
      matchQuery.type = type.toLowerCase();
    }

    // 1. Overall totals
    const totalsAgg = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = 0;

    totalsAgg.forEach((item) => {
      if (item._id === 'income') totalIncome = Math.round(item.total * 100) / 100;
      if (item._id === 'expense') totalExpenses = Math.round(item.total * 100) / 100;
      transactionCount += item.count;
    });

    const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;

    // 2. Category Breakdown (Expenses)
    const expenseCategoryQuery = { ...matchQuery, type: 'expense' };
    const categoryBreakdownAgg = await Transaction.aggregate([
      { $match: expenseCategoryQuery },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const categoryBreakdown = categoryBreakdownAgg.map((item) => ({
      category: item._id,
      total: Math.round(item.total * 100) / 100,
      count: item.count,
      percentage: totalExpenses > 0 ? Math.round((item.total / totalExpenses) * 1000) / 10 : 0
    }));

    const highestSpendingCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // 3. Transactions List
    const transactions = await Transaction.find(matchQuery)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return {
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        category: category || 'All',
        type: type || 'All'
      },
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
        transactionCount,
        highestSpendingCategory
      },
      categoryBreakdown,
      transactions
    };
  }

  // dbStore Fallback
  const filter = {};
  if (type && type !== 'all') filter.type = type;
  if (category && category !== 'all') filter.category = category;
  if (startDate) filter.startDate = startDate;
  if (endDate) filter.endDate = endDate;

  const { transactions } = await dbStore.getTransactions(userId, filter, { date: -1 }, 0, 10000);

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap = {};

  transactions.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'income') totalIncome += amt;
    if (tx.type === 'expense') {
      totalExpenses += amt;
      categoryMap[tx.category] = categoryMap[tx.category] || { total: 0, count: 0 };
      categoryMap[tx.category].total += amt;
      categoryMap[tx.category].count++;
    }
  });

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;

  const categoryBreakdown = Object.keys(categoryMap)
    .map((cat) => ({
      category: cat,
      total: Math.round(categoryMap[cat].total * 100) / 100,
      count: categoryMap[cat].count,
      percentage: totalExpenses > 0 ? Math.round((categoryMap[cat].total / totalExpenses) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.total - a.total);

  return {
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      category: category || 'All',
      type: type || 'All'
    },
    summary: {
      totalIncome,
      totalExpenses,
      netBalance,
      transactionCount: transactions.length,
      highestSpendingCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0] : null
    },
    categoryBreakdown,
    transactions
  };
};

module.exports = {
  getReportSummary
};
