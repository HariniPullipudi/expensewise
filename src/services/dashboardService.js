const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const dbStore = require('./dbStore');

const isMongo = () => mongoose.connection.readyState === 1;

const getDateRangeFilter = (period = 'this-month', customStart, customEnd) => {
  const now = new Date();
  let startDate = null;
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  switch (period) {
    case 'this-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'last-30-days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this-year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'all':
      startDate = new Date(2000, 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

const getDashboardSummary = async (userId, period, customStart, customEnd) => {
  const { startDate, endDate } = getDateRangeFilter(period, customStart, customEnd);
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;
  let allTimeBalance = 0;
  let recentTransactions = [];
  let totalMonthlyBudget = 0;
  let spentThisMonth = 0;

  if (isMongo()) {
    const periodTotals = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    periodTotals.forEach((group) => {
      if (group._id === 'income') totalIncome = Math.round(group.total * 100) / 100;
      if (group._id === 'expense') totalExpenses = Math.round(group.total * 100) / 100;
      transactionCount += group.count;
    });

    const allTimeTotals = await Transaction.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    let inc = 0, exp = 0;
    allTimeTotals.forEach((g) => {
      if (g._id === 'income') inc = g.total;
      if (g._id === 'expense') exp = g.total;
    });
    allTimeBalance = Math.round((inc - exp) * 100) / 100;

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [monthlyBudgets, currentMonthExp] = await Promise.all([
      Budget.find({ user: userId, month: currentMonth, year: currentYear }).lean(),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'expense',
            date: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    totalMonthlyBudget = monthlyBudgets.reduce((acc, b) => acc + b.amount, 0);
    spentThisMonth = currentMonthExp.length > 0 ? Math.round(currentMonthExp[0].total * 100) / 100 : 0;

    recentTransactions = await Transaction.find({ user: userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .lean();
  } else {
    // dbStore fallback
    const { transactions: allTx } = await dbStore.getTransactions(userId, {}, { date: -1 }, 0, 10000);

    const sTime = startDate.getTime();
    const eTime = endDate.getTime();
    const cmsTime = currentMonthStart.getTime();
    const cmeTime = currentMonthEnd.getTime();

    let allInc = 0, allExp = 0;

    allTx.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      const tTime = new Date(tx.date).getTime();

      if (tx.type === 'income') allInc += amt;
      if (tx.type === 'expense') allExp += amt;

      if (tTime >= sTime && tTime <= eTime) {
        if (tx.type === 'income') totalIncome += amt;
        if (tx.type === 'expense') totalExpenses += amt;
        transactionCount++;
      }

      if (tx.type === 'expense' && tTime >= cmsTime && tTime <= cmeTime) {
        spentThisMonth += amt;
      }
    });

    allTimeBalance = Math.round((allInc - allExp) * 100) / 100;
    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    spentThisMonth = Math.round(spentThisMonth * 100) / 100;

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const budgets = await dbStore.getBudgets(userId, currentMonth, currentYear);
    totalMonthlyBudget = budgets.reduce((acc, b) => acc + Number(b.amount || 0), 0);

    recentTransactions = allTx.slice(0, 5);
  }

  const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;
  const budgetUsagePercent = totalMonthlyBudget > 0
    ? Math.round((spentThisMonth / totalMonthlyBudget) * 1000) / 10
    : 0;

  return {
    period: {
      type: period || 'this-month',
      startDate,
      endDate
    },
    summary: {
      totalIncome,
      totalExpenses,
      netBalance,
      transactionCount,
      allTimeBalance,
      budget: {
        totalBudgeted: Math.round(totalMonthlyBudget * 100) / 100,
        spentThisMonth,
        usagePercent: budgetUsagePercent,
        hasBudgets: totalMonthlyBudget > 0
      }
    },
    recentTransactions
  };
};

const getDashboardCharts = async (userId, period, customStart, customEnd) => {
  const { startDate, endDate } = getDateRangeFilter(period, customStart, customEnd);
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

  if (isMongo()) {
    // 1. Expense Distribution
    const expenseByCategory = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    const totalExp = expenseByCategory.reduce((s, i) => s + i.total, 0);
    const expenseDistribution = expenseByCategory.map((i) => ({
      category: i._id,
      amount: Math.round(i.total * 100) / 100,
      count: i.count,
      percentage: totalExp > 0 ? Math.round((i.total / totalExp) * 1000) / 10 : 0
    }));

    // 2. 6-Month Comparison
    const monthlyAgg = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' }
        }
      }
    ]);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyComparison = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const label = `${monthNames[mo - 1]} ${yr}`;
      const incItem = monthlyAgg.find((m) => m._id.year === yr && m._id.month === mo && m._id.type === 'income');
      const expItem = monthlyAgg.find((m) => m._id.year === yr && m._id.month === mo && m._id.type === 'expense');
      monthlyComparison.push({
        monthLabel: label,
        year: yr,
        month: mo,
        income: incItem ? Math.round(incItem.total * 100) / 100 : 0,
        expense: expItem ? Math.round(expItem.total * 100) / 100 : 0
      });
    }

    // 3. Spending Trend
    const trendAgg = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);
    const spendingTrend = trendAgg.map((i) => ({ date: i._id, amount: Math.round(i.total * 100) / 100 }));

    return {
      expenseDistribution,
      monthlyComparison,
      spendingTrend,
      categoryRanking: expenseDistribution.slice(0, 7)
    };
  }

  // dbStore Fallback
  const { transactions: allTx } = await dbStore.getTransactions(userId, {}, { date: 1 }, 0, 10000);
  const sTime = startDate.getTime();
  const eTime = endDate.getTime();
  const sixMoTime = sixMonthsAgo.getTime();

  const categoryMap = {};
  const trendMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize 6 months
  const monthlyComparison = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    monthlyComparison.push({
      monthLabel: `${monthNames[mo - 1]} ${yr}`,
      year: yr,
      month: mo,
      income: 0,
      expense: 0
    });
  }

  allTx.forEach((tx) => {
    const tTime = new Date(tx.date).getTime();
    const tDate = new Date(tx.date);
    const amt = Number(tx.amount || 0);

    // Within selected period
    if (tTime >= sTime && tTime <= eTime && tx.type === 'expense') {
      categoryMap[tx.category] = categoryMap[tx.category] || { total: 0, count: 0 };
      categoryMap[tx.category].total += amt;
      categoryMap[tx.category].count++;

      const dateStr = tDate.toISOString().split('T')[0];
      trendMap[dateStr] = (trendMap[dateStr] || 0) + amt;
    }

    // Within last 6 months
    if (tTime >= sixMoTime) {
      const yr = tDate.getFullYear();
      const mo = tDate.getMonth() + 1;
      const target = monthlyComparison.find((m) => m.year === yr && m.month === mo);
      if (target) {
        if (tx.type === 'income') target.income += amt;
        if (tx.type === 'expense') target.expense += amt;
      }
    }
  });

  const totalExp = Object.values(categoryMap).reduce((s, i) => s + i.total, 0);
  const expenseDistribution = Object.keys(categoryMap)
    .map((cat) => ({
      category: cat,
      amount: Math.round(categoryMap[cat].total * 100) / 100,
      count: categoryMap[cat].count,
      percentage: totalExp > 0 ? Math.round((categoryMap[cat].total / totalExp) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const spendingTrend = Object.keys(trendMap)
    .sort()
    .map((d) => ({ date: d, amount: Math.round(trendMap[d] * 100) / 100 }));

  return {
    expenseDistribution,
    monthlyComparison,
    spendingTrend,
    categoryRanking: expenseDistribution.slice(0, 7)
  };
};

module.exports = {
  getDateRangeFilter,
  getDashboardSummary,
  getDashboardCharts
};
