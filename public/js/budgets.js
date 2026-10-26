/**
 * Category Budgets Management
 */

let currentBudgetDeleteId = null;

const expenseCategories = [
  'Food', 'Transport', 'Shopping', 'Housing', 'Utilities',
  'Education', 'Healthcare', 'Entertainment', 'Travel',
  'Subscriptions', 'Personal Care', 'Other Expenses'
];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth(true);
  if (!user) return;

  // Set default Month & Year in Selector & Modal
  const now = new Date();
  const monthSelect = document.getElementById('budget-month-filter');
  const yearInput = document.getElementById('budget-year-filter');
  const modalMonth = document.getElementById('budget-month');
  const modalYear = document.getElementById('budget-year');

  if (monthSelect) monthSelect.value = now.getMonth() + 1;
  if (yearInput) yearInput.value = now.getFullYear();
  if (modalMonth) modalMonth.value = now.getMonth() + 1;
  if (modalYear) modalYear.value = now.getFullYear();

  // Populate Add Budget Category dropdown
  const categorySelect = document.getElementById('budget-category');
  if (categorySelect) {
    categorySelect.innerHTML = expenseCategories
      .map((cat) => `<option value="${cat}">${cat}</option>`)
      .join('');
  }

  // Load budgets for selected period
  await loadBudgets();

  // Month & Year Filter listeners
  if (monthSelect) monthSelect.addEventListener('change', loadBudgets);
  if (yearInput) yearInput.addEventListener('change', loadBudgets);

  // Add Budget Form
  const addForm = document.getElementById('add-budget-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = document.getElementById('budget-category').value;
      const amount = parseFloat(document.getElementById('budget-amount').value);
      const month = parseInt(document.getElementById('budget-month').value, 10);
      const year = parseInt(document.getElementById('budget-year').value, 10);
      const description = document.getElementById('budget-desc').value.trim();

      if (!category || isNaN(amount) || amount <= 0) {
        return showToast('Please provide a valid category and budget limit amount.', 'warning');
      }

      try {
        const res = await api.post('/budgets', {
          category,
          amount,
          month,
          year,
          description
        });

        if (res.success) {
          showToast('Budget created successfully!', 'success');
          closeModal('add-budget-modal');
          addForm.reset();
          document.getElementById('budget-month').value = monthSelect.value;
          document.getElementById('budget-year').value = yearInput.value;
          await loadBudgets();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Edit Budget Form
  const editForm = document.getElementById('edit-budget-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-budget-id').value;
      const amount = parseFloat(document.getElementById('edit-budget-amount').value);
      const description = document.getElementById('edit-budget-desc').value.trim();

      if (isNaN(amount) || amount <= 0) {
        return showToast('Please enter a valid amount greater than 0', 'warning');
      }

      try {
        const res = await api.put(`/budgets/${id}`, {
          amount,
          description
        });

        if (res.success) {
          showToast('Budget limit updated successfully!', 'success');
          closeModal('edit-budget-modal');
          await loadBudgets();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Confirm Delete Budget
  const confirmDeleteBtn = document.getElementById('confirm-budget-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!currentBudgetDeleteId) return;
      try {
        const res = await api.delete(`/budgets/${currentBudgetDeleteId}`);
        if (res.success) {
          showToast('Budget deleted successfully', 'success');
          closeModal('delete-budget-modal');
          currentBudgetDeleteId = null;
          await loadBudgets();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});

async function loadBudgets() {
  const month = document.getElementById('budget-month-filter')?.value || new Date().getMonth() + 1;
  const year = document.getElementById('budget-year-filter')?.value || new Date().getFullYear();

  try {
    const res = await api.get(`/budgets?month=${month}&year=${year}`);
    if (res.success) {
      renderBudgetSummary(res.data.summary);
      renderBudgetsGrid(res.data.budgets);
    }
  } catch (error) {
    showToast('Failed to load budgets: ' + error.message, 'error');
  }
}

function renderBudgetSummary(summary) {
  document.getElementById('total-budget-allocated').textContent = formatINR(summary.totalBudgeted);
  document.getElementById('total-budget-spent').textContent = formatINR(summary.totalSpent);
  
  const remEl = document.getElementById('total-budget-remaining');
  remEl.textContent = formatINR(summary.remaining);
  remEl.style.color = summary.remaining >= 0 ? 'var(--success)' : 'var(--danger)';

  const pctEl = document.getElementById('overall-budget-pct');
  pctEl.textContent = `${summary.overallPercentage}% Used`;
}

function renderBudgetsGrid(budgets = []) {
  const container = document.getElementById('budgets-grid-container');
  if (!container) return;

  if (budgets.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;" class="card empty-state">
        <i class="fa-solid fa-piggy-bank empty-icon"></i>
        <p class="empty-title">No category budgets for this month</p>
        <p class="empty-desc">Create category spending limits to keep track of your monthly expenses and avoid overspending.</p>
        <button class="btn btn-primary" onclick="openModal('add-budget-modal')">
          <i class="fa-solid fa-plus"></i> Create New Budget
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = budgets
    .map((b) => {
      let badgeClass = 'badge-category';
      let progressClass = 'ok';
      let borderClass = 'ok-border';
      let statusText = 'On Track';

      if (b.status === 'exceeded') {
        badgeClass = 'badge-exceeded';
        progressClass = 'exceeded';
        borderClass = 'exceeded-border';
        statusText = 'Exceeded Limit';
      } else if (b.status === 'warning') {
        badgeClass = 'badge-warning';
        progressClass = 'warning';
        borderClass = 'warning-border';
        statusText = 'Near Limit (>=80%)';
      }

      const barWidth = Math.min(100, b.percentage);

      return `
      <div class="budget-card ${borderClass}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${b.category}</h3>
              ${b.description ? `<p style="font-size: 0.8rem; color: var(--text-muted);">${b.description}</p>` : ''}
            </div>
            <span class="badge ${badgeClass}">${statusText}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem;">
            <span style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${formatINR(b.spent)}</span>
            <span style="font-size: 0.88rem; color: var(--text-muted); font-weight: 600;">of ${formatINR(b.amount)}</span>
          </div>

          <div class="progress-container">
            <div class="progress-bar ${progressClass}" style="width: ${barWidth}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">
            <span>${b.percentage}% spent</span>
            <span>${b.remaining >= 0 ? `${formatINR(b.remaining)} left` : `${formatINR(Math.abs(b.remaining))} over limit`}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
          <button class="btn btn-outline btn-sm" onclick="openEditBudgetModal('${b._id}', '${b.category}', ${b.amount}, '${b.description || ''}')">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" onclick="openDeleteBudgetModal('${b._id}')">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

function openEditBudgetModal(id, category, amount, description) {
  document.getElementById('edit-budget-id').value = id;
  document.getElementById('edit-budget-category-label').textContent = category;
  document.getElementById('edit-budget-amount').value = amount;
  document.getElementById('edit-budget-desc').value = description;
  openModal('edit-budget-modal');
}

function openDeleteBudgetModal(id) {
  currentBudgetDeleteId = id;
  openModal('delete-budget-modal');
}
