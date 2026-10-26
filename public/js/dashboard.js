/**
 * Dashboard Controller with Chart.js Visualizations
 */

let expenseChartInstance = null;
let incomeExpenseChartInstance = null;
let trendChartInstance = null;
let categoryRankChartInstance = null;

// Palette for charts
const chartColors = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth(true);
  if (!user) return;

  // Initialize date in quick-add modal
  const dateInput = document.getElementById('tx-date');
  if (dateInput) {
    dateInput.value = formatDateForInput();
  }

  // Load Dashboard Data
  await loadDashboard();

  // Period filter change listener
  const periodSelect = document.getElementById('period-filter');
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      const customDates = document.getElementById('custom-date-inputs');
      if (periodSelect.value === 'custom') {
        customDates.style.display = 'flex';
      } else {
        customDates.style.display = 'none';
        loadDashboard();
      }
    });
  }

  // Apply custom date range button
  const applyCustomBtn = document.getElementById('apply-custom-date');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      loadDashboard();
    });
  }

  // Quick Add Transaction Form
  const quickAddForm = document.getElementById('quick-add-form');
  if (quickAddForm) {
    quickAddForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('tx-title').value.trim();
      const type = document.getElementById('tx-type').value;
      const amount = parseFloat(document.getElementById('tx-amount').value);
      const category = document.getElementById('tx-category').value;
      const date = document.getElementById('tx-date').value;
      const paymentMethod = document.getElementById('tx-payment-method').value;
      const notes = document.getElementById('tx-notes').value.trim();

      if (!title || isNaN(amount) || amount <= 0 || !category) {
        return showToast('Please enter title, valid amount, and category', 'warning');
      }

      try {
        const res = await api.post('/transactions', {
          title,
          type,
          amount,
          category,
          date,
          paymentMethod,
          notes
        });

        if (res.success) {
          showToast('Transaction added successfully!', 'success');
          closeModal('quick-add-modal');
          quickAddForm.reset();
          if (dateInput) dateInput.value = formatDateForInput();
          await loadDashboard();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});

async function loadDashboard() {
  const periodSelect = document.getElementById('period-filter');
  const period = periodSelect ? periodSelect.value : 'this-month';
  let queryParams = `?period=${period}`;

  if (period === 'custom') {
    const start = document.getElementById('custom-start')?.value;
    const end = document.getElementById('custom-end')?.value;
    if (start && end) {
      queryParams += `&startDate=${start}&endDate=${end}`;
    }
  }

  try {
    const [summaryRes, chartsRes] = await Promise.all([
      api.get(`/dashboard/summary${queryParams}`),
      api.get(`/dashboard/charts${queryParams}`)
    ]);

    if (summaryRes.success) {
      updateSummaryCards(summaryRes.data.summary);
      renderRecentTransactions(summaryRes.data.recentTransactions);
    }

    if (chartsRes.success) {
      renderCharts(chartsRes.data);
    }
  } catch (error) {
    showToast('Failed to load dashboard data: ' + error.message, 'error');
  }
}

function updateSummaryCards(summary) {
  document.getElementById('stat-income').textContent = formatINR(summary.totalIncome);
  document.getElementById('stat-expenses').textContent = formatINR(summary.totalExpenses);
  
  const netEl = document.getElementById('stat-net-balance');
  netEl.textContent = formatINR(summary.netBalance);
  netEl.className = 'stat-value ' + (summary.netBalance >= 0 ? 'income-text' : 'expense-text');

  document.getElementById('stat-count').textContent = summary.transactionCount;

  // Monthly Budget usage card
  const budgetCardText = document.getElementById('stat-budget-usage');
  const budgetSubtext = document.getElementById('stat-budget-subtext');
  if (summary.budget && summary.budget.hasBudgets) {
    budgetCardText.textContent = `${summary.budget.usagePercent}%`;
    budgetSubtext.textContent = `${formatINR(summary.budget.spentThisMonth)} spent of ${formatINR(summary.budget.totalBudgeted)}`;
    if (summary.budget.usagePercent >= 100) {
      budgetCardText.className = 'stat-value expense-text';
    } else if (summary.budget.usagePercent >= 80) {
      budgetCardText.className = 'stat-value';
      budgetCardText.style.color = 'var(--warning)';
    } else {
      budgetCardText.className = 'stat-value income-text';
    }
  } else {
    budgetCardText.textContent = 'No Budgets';
    budgetSubtext.textContent = 'Set monthly category budgets';
  }
}

function renderRecentTransactions(transactions = []) {
  const listEl = document.getElementById('recent-transactions-list');
  if (!listEl) return;

  if (transactions.length === 0) {
    listEl.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <i class="fa-solid fa-receipt empty-icon"></i>
          <p class="empty-title">No transactions found</p>
          <p class="empty-desc">You haven't recorded any income or expenses yet.</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('quick-add-modal')">
            <i class="fa-solid fa-plus"></i> Add Transaction
          </button>
        </td>
      </tr>
    `;
    return;
  }

  listEl.innerHTML = transactions
    .map(
      (tx) => `
    <tr>
      <td>
        <div style="font-weight: 600; color: var(--text-main);">${tx.title}</div>
        <small style="color: var(--text-muted);">${formatDate(tx.date)}</small>
      </td>
      <td>
        <span class="badge badge-category">${tx.category}</span>
      </td>
      <td>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${tx.paymentMethod || 'UPI'}</span>
      </td>
      <td>
        <span class="badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}">
          ${tx.type === 'income' ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-arrow-up"></i>'}
          ${tx.type}
        </span>
      </td>
      <td style="text-align: right; font-weight: 700; ${tx.type === 'income' ? 'color: var(--success);' : 'color: var(--danger);'}">
        ${tx.type === 'income' ? '+' : '-'}${formatINR(tx.amount)}
      </td>
    </tr>
  `
    )
    .join('');
}

function renderCharts(chartsData) {
  // 1. Expense Distribution Doughnut Chart
  const expenseCanvas = document.getElementById('expenseDistributionChart');
  if (expenseCanvas) {
    if (expenseChartInstance) expenseChartInstance.destroy();

    const data = chartsData.expenseDistribution || [];
    const labels = data.map((d) => d.category);
    const amounts = data.map((d) => d.amount);

    if (amounts.length === 0) {
      expenseChartInstance = new Chart(expenseCanvas, {
        type: 'doughnut',
        data: {
          labels: ['No Expenses Recorded'],
          datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { tooltip: { enabled: false } }
        }
      });
    } else {
      expenseChartInstance = new Chart(expenseCanvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: amounts,
              backgroundColor: chartColors.slice(0, labels.length),
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverOffset: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = ctx.raw || 0;
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ${formatINR(val)} (${pct}%)`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // 2. Income vs Expenses 6-Month Bar Chart
  const incExpCanvas = document.getElementById('incomeExpenseChart');
  if (incExpCanvas) {
    if (incomeExpenseChartInstance) incomeExpenseChartInstance.destroy();

    const comp = chartsData.monthlyComparison || [];
    const labels = comp.map((c) => c.monthLabel);
    const incomes = comp.map((c) => c.income);
    const expenses = comp.map((c) => c.expense);

    incomeExpenseChartInstance = new Chart(incExpCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomes,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Expenses',
            data: expenses,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            },
            grid: { color: '#f1f5f9' }
          },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 3. Spending Trend Line Chart
  const trendCanvas = document.getElementById('spendingTrendChart');
  if (trendCanvas) {
    if (trendChartInstance) trendChartInstance.destroy();

    const trend = chartsData.spendingTrend || [];
    const labels = trend.map((t) => t.date);
    const values = trend.map((t) => t.amount);

    trendChartInstance = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Expenses',
            data: values,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#4f46e5',
            pointRadius: values.length > 20 ? 1 : 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            },
            grid: { color: '#f1f5f9' }
          },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Spent: ${formatINR(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 4. Category Spending Ranking Horizontal Bar Chart
  const rankCanvas = document.getElementById('categoryRankingChart');
  if (rankCanvas) {
    if (categoryRankChartInstance) categoryRankChartInstance.destroy();

    const rank = chartsData.categoryRanking || [];
    const labels = rank.map((r) => r.category);
    const amounts = rank.map((r) => r.amount);

    categoryRankChartInstance = new Chart(rankCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Spent',
            data: amounts,
            backgroundColor: '#6366f1',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (val) => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            },
            grid: { color: '#f1f5f9' }
          },
          y: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Total: ${formatINR(ctx.raw)}`
            }
          }
        }
      }
    });
  }
}
