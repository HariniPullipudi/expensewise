/**
 * Transactions CRUD Management
 */

let currentPage = 1;
const limit = 10;
let currentDeleteId = null;
let searchDebounceTimeout = null;

const categories = {
  income: ['Salary', 'Freelancing', 'Business', 'Investment Returns', 'Gifts', 'Other Income'],
  expense: ['Food', 'Transport', 'Shopping', 'Housing', 'Utilities', 'Education', 'Healthcare', 'Entertainment', 'Travel', 'Subscriptions', 'Personal Care', 'Other Expenses']
};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth(true);
  if (!user) return;

  // Initialize Category Dropdowns
  populateCategorySelect('tx-category', 'all');
  populateCategorySelect('filter-category', 'all', true);

  // Initialize Add Modal Date
  document.getElementById('tx-date').value = formatDateForInput();

  // Load Initial Transactions
  await loadTransactions();

  // Search input with debounce
  const searchInput = document.getElementById('search-transactions');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        currentPage = 1;
        loadTransactions();
      }, 300);
    });
  }

  // Filter Event Listeners
  ['filter-type', 'filter-category', 'sort-by', 'filter-start-date', 'filter-end-date'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        currentPage = 1;
        loadTransactions();
      });
    }
  });

  // Dynamic category update when transaction type changes in Add/Edit modals
  const typeSelect = document.getElementById('tx-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      populateCategorySelect('tx-category', typeSelect.value);
    });
  }

  const editTypeSelect = document.getElementById('edit-tx-type');
  if (editTypeSelect) {
    editTypeSelect.addEventListener('change', () => {
      populateCategorySelect('edit-tx-category', editTypeSelect.value);
    });
  }

  // Add Transaction Form Submission
  const addForm = document.getElementById('add-transaction-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
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
          closeModal('add-transaction-modal');
          addForm.reset();
          document.getElementById('tx-date').value = formatDateForInput();
          await loadTransactions();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Edit Transaction Form Submission
  const editForm = document.getElementById('edit-transaction-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-tx-id').value;
      const title = document.getElementById('edit-tx-title').value.trim();
      const type = document.getElementById('edit-tx-type').value;
      const amount = parseFloat(document.getElementById('edit-tx-amount').value);
      const category = document.getElementById('edit-tx-category').value;
      const date = document.getElementById('edit-tx-date').value;
      const paymentMethod = document.getElementById('edit-tx-payment-method').value;
      const notes = document.getElementById('edit-tx-notes').value.trim();

      try {
        const res = await api.put(`/transactions/${id}`, {
          title,
          type,
          amount,
          category,
          date,
          paymentMethod,
          notes
        });

        if (res.success) {
          showToast('Transaction updated successfully!', 'success');
          closeModal('edit-transaction-modal');
          await loadTransactions();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Confirm Delete Button
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!currentDeleteId) return;
      try {
        const res = await api.delete(`/transactions/${currentDeleteId}`);
        if (res.success) {
          showToast('Transaction deleted successfully', 'success');
          closeModal('delete-modal');
          currentDeleteId = null;
          await loadTransactions();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Export CSV Button
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const type = document.getElementById('filter-type')?.value || '';
      const category = document.getElementById('filter-category')?.value || '';
      const startDate = document.getElementById('filter-start-date')?.value || '';
      const endDate = document.getElementById('filter-end-date')?.value || '';

      let url = '/api/reports/export.csv?';
      if (type && type !== 'all') url += `&type=${type}`;
      if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      window.location.href = url;
    });
  }
});

function populateCategorySelect(selectId, type = 'all', includeAllOption = false) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '';

  if (includeAllOption) {
    const opt = document.createElement('option');
    opt.value = 'all';
    opt.textContent = 'All Categories';
    select.appendChild(opt);
  }

  let catList = [];
  if (type === 'income') {
    catList = categories.income;
  } else if (type === 'expense') {
    catList = categories.expense;
  } else {
    catList = [...categories.income, ...categories.expense];
  }

  catList.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

async function loadTransactions() {
  const search = document.getElementById('search-transactions')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const sortByVal = document.getElementById('sort-by')?.value || 'date-desc';
  const startDate = document.getElementById('filter-start-date')?.value || '';
  const endDate = document.getElementById('filter-end-date')?.value || '';

  const [sortBy, sortOrder] = sortByVal.split('-');

  let query = `?page=${currentPage}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
  if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
  if (type && type !== 'all') query += `&type=${type}`;
  if (category && category !== 'all') query += `&category=${encodeURIComponent(category)}`;
  if (startDate) query += `&startDate=${startDate}`;
  if (endDate) query += `&endDate=${endDate}`;

  try {
    const res = await api.get(`/transactions${query}`);
    if (res.success) {
      renderTransactionsTable(res.data.transactions);
      renderPagination(res.data.pagination);
    }
  } catch (error) {
    showToast('Failed to load transactions: ' + error.message, 'error');
  }
}

function renderTransactionsTable(transactions = []) {
  const tbody = document.getElementById('transactions-table-body');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="fa-solid fa-folder-open empty-icon"></i>
          <p class="empty-title">No transactions match your criteria</p>
          <p class="empty-desc">Try clearing filters or search terms, or add a new transaction.</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('add-transaction-modal')">
            <i class="fa-solid fa-plus"></i> Add Transaction
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions
    .map(
      (tx) => `
    <tr>
      <td>
        <span style="font-weight: 500; color: var(--text-muted);">${formatDate(tx.date)}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-main);">${tx.title}</div>
        ${tx.notes ? `<small style="color: var(--text-muted); font-size: 0.78rem;">${tx.notes}</small>` : ''}
      </td>
      <td>
        <span class="badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}">
          ${tx.type === 'income' ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-arrow-up"></i>'}
          ${tx.type}
        </span>
      </td>
      <td>
        <span class="badge badge-category">${tx.category}</span>
      </td>
      <td>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${tx.paymentMethod || 'UPI'}</span>
      </td>
      <td style="font-weight: 700; ${tx.type === 'income' ? 'color: var(--success);' : 'color: var(--danger);'}">
        ${tx.type === 'income' ? '+' : '-'}${formatINR(tx.amount)}
      </td>
      <td style="text-align: right;">
        <button class="btn btn-outline btn-icon" title="Edit" onclick="openEditModal('${tx._id}')" style="margin-right: 0.35rem;">
          <i class="fa-solid fa-pen-to-square" style="color: var(--primary);"></i>
        </button>
        <button class="btn btn-outline btn-icon" title="Delete" onclick="openDeleteModal('${tx._id}')">
          <i class="fa-solid fa-trash-can" style="color: var(--danger);"></i>
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  const { totalCount, totalPages, currentPage: page, hasPrevPage, hasNextPage } = pagination;

  document.getElementById('pagination-info').textContent =
    `Showing ${(page - 1) * limit + (totalCount > 0 ? 1 : 0)} to ${Math.min(page * limit, totalCount)} of ${totalCount} records`;

  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  prevBtn.disabled = !hasPrevPage;
  nextBtn.disabled = !hasNextPage;

  prevBtn.onclick = () => {
    if (hasPrevPage) {
      currentPage--;
      loadTransactions();
    }
  };

  nextBtn.onclick = () => {
    if (hasNextPage) {
      currentPage++;
      loadTransactions();
    }
  };
}

async function openEditModal(id) {
  try {
    const res = await api.get(`/transactions/${id}`);
    if (res.success && res.data.transaction) {
      const tx = res.data.transaction;
      document.getElementById('edit-tx-id').value = tx._id;
      document.getElementById('edit-tx-title').value = tx.title;
      document.getElementById('edit-tx-type').value = tx.type;
      document.getElementById('edit-tx-amount').value = tx.amount;
      
      populateCategorySelect('edit-tx-category', tx.type);
      document.getElementById('edit-tx-category').value = tx.category;

      document.getElementById('edit-tx-date').value = formatDateForInput(tx.date);
      document.getElementById('edit-tx-payment-method').value = tx.paymentMethod || 'UPI';
      document.getElementById('edit-tx-notes').value = tx.notes || '';

      openModal('edit-transaction-modal');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeleteModal(id) {
  currentDeleteId = id;
  openModal('delete-modal');
}
