/**
 * Financial Reports & CSV Export Controller
 */

let reportChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth(true);
  if (!user) return;

  // Set default dates: Start of current month to today
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  document.getElementById('report-start-date').value = formatDateForInput(firstDay);
  document.getElementById('report-end-date').value = formatDateForInput(now);

  // Load Initial Report
  await loadReport();

  // Filter change handlers
  document.getElementById('generate-report-btn').addEventListener('click', loadReport);

  // Print Report Button
  document.getElementById('print-report-btn').addEventListener('click', () => {
    window.print();
  });

  // Export CSV Button
  document.getElementById('export-report-csv-btn').addEventListener('click', () => {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const type = document.getElementById('report-type').value;
    const category = document.getElementById('report-category').value;

    let url = '/api/reports/export.csv?';
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (type && type !== 'all') url += `&type=${type}`;
    if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;

    window.location.href = url;
  });
});

async function loadReport() {
  const startDate = document.getElementById('report-start-date').value;
  const endDate = document.getElementById('report-end-date').value;
  const type = document.getElementById('report-type').value;
  const category = document.getElementById('report-category').value;

  let query = '?';
  if (startDate) query += `&startDate=${startDate}`;
  if (endDate) query += `&endDate=${endDate}`;
  if (type && type !== 'all') query += `&type=${type}`;
  if (category && category !== 'all') query += `&category=${encodeURIComponent(category)}`;

  try {
    const res = await api.get(`/reports/summary${query}`);
    if (res.success) {
      renderReportSummary(res.data.summary);
      renderCategoryBreakdown(res.data.categoryBreakdown);
      renderReportTransactions(res.data.transactions);
      renderReportChart(res.data.categoryBreakdown);
    }
  } catch (error) {
    showToast('Failed to load report: ' + error.message, 'error');
  }
}

function renderReportSummary(summary) {
  document.getElementById('report-income').textContent = formatINR(summary.totalIncome);
  document.getElementById('report-expenses').textContent = formatINR(summary.totalExpenses);

  const netEl = document.getElementById('report-net');
  netEl.textContent = formatINR(summary.netBalance);
  netEl.className = 'stat-value ' + (summary.netBalance >= 0 ? 'income-text' : 'expense-text');

  document.getElementById('report-count').textContent = summary.transactionCount;

  // Highest spending category
  const topCatEl = document.getElementById('report-top-category');
  if (summary.highestSpendingCategory) {
    topCatEl.textContent = `${summary.highestSpendingCategory.category} (${formatINR(summary.highestSpendingCategory.total)})`;
  } else {
    topCatEl.textContent = 'None';
  }
}

function renderCategoryBreakdown(breakdown = []) {
  const tbody = document.getElementById('category-breakdown-body');
  if (!tbody) return;

  if (breakdown.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No expense data for this period</td></tr>`;
    return;
  }

  tbody.innerHTML = breakdown
    .map(
      (item) => `
    <tr>
      <td style="font-weight: 600;">${item.category}</td>
      <td>${item.count} transactions</td>
      <td style="font-weight: 700; color: var(--danger);">${formatINR(item.total)}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="progress-container" style="flex: 1; height: 6px; margin: 0;">
            <div class="progress-bar ok" style="width: ${item.percentage}%; background-color: var(--primary);"></div>
          </div>
          <span style="font-size: 0.82rem; font-weight: 600; min-width: 45px;">${item.percentage}%</span>
        </div>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderReportTransactions(transactions = []) {
  const tbody = document.getElementById('report-transactions-body');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching transactions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions
    .map(
      (tx) => `
    <tr>
      <td>${formatDate(tx.date)}</td>
      <td style="font-weight: 600;">${tx.title}</td>
      <td><span class="badge badge-category">${tx.category}</span></td>
      <td>${tx.paymentMethod || 'UPI'}</td>
      <td>
        <span class="badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}">
          ${tx.type}
        </span>
      </td>
      <td style="font-weight: 700; text-align: right; ${tx.type === 'income' ? 'color: var(--success);' : 'color: var(--danger);'}">
        ${tx.type === 'income' ? '+' : '-'}${formatINR(tx.amount)}
      </td>
    </tr>
  `
    )
    .join('');
}

function renderReportChart(breakdown = []) {
  const canvas = document.getElementById('reportCategoryChart');
  if (!canvas) return;

  if (reportChartInstance) reportChartInstance.destroy();

  const labels = breakdown.map((b) => b.category);
  const data = breakdown.map((b) => b.total);
  const colors = [
    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
  ];

  if (data.length === 0) {
    reportChartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['No Data'],
        datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { enabled: false } }
      }
    });
    return;
  }

  reportChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, padding: 8 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}`
          }
        }
      },
      cutout: '60%'
    }
  });
}
