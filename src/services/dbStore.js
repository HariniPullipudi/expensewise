/**
 * Resilient Local Storage Engine (Embedded DB)
 * Provides seamless offline data persistence when MongoDB service is not started.
 * Automatically synchronizes with data/local_db.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate MongoDB-compatible 24-character hexadecimal ObjectId
const generateId = () => crypto.randomBytes(12).toString('hex');

// Load database from disk or initialize with rich demo dataset
const loadDb = () => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('[LocalDB] Corrupted db file, re-initializing:', e.message);
    }
  }

  // Pre-seed demo user: demo@expensewise.com / Password123!
  const demoUserId = '65e01a1a1a1a1a1a1a1a1a01';
  const salt = bcrypt.genSaltSync(10);
  const demoPasswordHash = bcrypt.hashSync('Password123!', salt);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const initialDb = {
    users: [
      {
        _id: demoUserId,
        name: 'Demo Student',
        email: 'demo@expensewise.com',
        passwordHash: demoPasswordHash,
        currency: 'INR',
        createdAt: new Date(currentYear, currentMonth - 2, 1).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    budgets: [
      {
        _id: generateId(),
        user: demoUserId,
        category: 'Food',
        amount: 8000,
        month: currentMonth + 1,
        year: currentYear,
        description: 'Monthly groceries and weekend takeout',
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        category: 'Transport',
        amount: 3500,
        month: currentMonth + 1,
        year: currentYear,
        description: 'Metro card, fuel, and cab fares',
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        category: 'Entertainment',
        amount: 2500,
        month: currentMonth + 1,
        year: currentYear,
        description: 'Movies, outings, and subscriptions',
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        category: 'Utilities',
        amount: 4000,
        month: currentMonth + 1,
        year: currentYear,
        description: 'Electricity, water, and broadband bill',
        createdAt: new Date().toISOString()
      }
    ],
    transactions: [
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Monthly Salary Credit',
        type: 'income',
        amount: 65000,
        category: 'Salary',
        date: new Date(currentYear, currentMonth, 1).toISOString(),
        paymentMethod: 'Net Banking',
        notes: 'Corporate salary transfer',
        createdAt: new Date(currentYear, currentMonth, 1).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Freelance UI Design Project',
        type: 'income',
        amount: 15000,
        category: 'Freelancing',
        date: new Date(currentYear, currentMonth, 10).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Client website redesign milestone 1',
        createdAt: new Date(currentYear, currentMonth, 10).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Supermarket Groceries (D-Mart)',
        type: 'expense',
        amount: 4250,
        category: 'Food',
        date: new Date(currentYear, currentMonth, 4).toISOString(),
        paymentMethod: 'Debit Card',
        notes: 'Monthly staples, vegetables, and pantry items',
        createdAt: new Date(currentYear, currentMonth, 4).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Weekend Dining with Family',
        type: 'expense',
        amount: 1850,
        category: 'Food',
        date: new Date(currentYear, currentMonth, 12).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Dinner at Barbeque Nation',
        createdAt: new Date(currentYear, currentMonth, 12).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Metro SmartCard Monthly Recharge',
        type: 'expense',
        amount: 1200,
        category: 'Transport',
        date: new Date(currentYear, currentMonth, 2).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Daily office commute',
        createdAt: new Date(currentYear, currentMonth, 2).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Electricity Bill Payment',
        type: 'expense',
        amount: 2150,
        category: 'Utilities',
        date: new Date(currentYear, currentMonth, 8).toISOString(),
        paymentMethod: 'Net Banking',
        notes: 'State electricity board online payment',
        createdAt: new Date(currentYear, currentMonth, 8).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'High-Speed Broadband Bill',
        type: 'expense',
        amount: 999,
        category: 'Utilities',
        date: new Date(currentYear, currentMonth, 11).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Fiber 200 Mbps plan',
        createdAt: new Date(currentYear, currentMonth, 11).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Cinema Tickets & Snacks',
        type: 'expense',
        amount: 850,
        category: 'Entertainment',
        date: new Date(currentYear, currentMonth, 15).toISOString(),
        paymentMethod: 'Credit Card',
        notes: 'Weekend movie with friends',
        createdAt: new Date(currentYear, currentMonth, 15).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Streaming Subscriptions Bundle',
        type: 'expense',
        amount: 699,
        category: 'Subscriptions',
        date: new Date(currentYear, currentMonth, 5).toISOString(),
        paymentMethod: 'Credit Card',
        notes: 'Netflix & Spotify family plans',
        createdAt: new Date(currentYear, currentMonth, 5).toISOString()
      },
      {
        _id: generateId(),
        user: demoUserId,
        title: 'Pharmacy & Health Vitamins',
        type: 'expense',
        amount: 1450,
        category: 'Healthcare',
        date: new Date(currentYear, currentMonth, 18).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Monthly prescription & supplements',
        createdAt: new Date(currentYear, currentMonth, 18).toISOString()
      }
    ]
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
  return initialDb;
};

const saveDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[LocalDB Save Error]', err.message);
  }
};

// Database store methods
const dbStore = {
  // Users
  findUserByEmail: async (email) => {
    const db = loadDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findUserById: async (id) => {
    const db = loadDb();
    return db.users.find((u) => u._id.toString() === id.toString()) || null;
  },

  createUser: async (userData) => {
    const db = loadDb();
    const newUser = {
      _id: generateId(),
      name: userData.name,
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      currency: userData.currency || 'INR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDb(db);
    return newUser;
  },

  updateUser: async (id, updateFields) => {
    const db = loadDb();
    const idx = db.users.findIndex((u) => u._id.toString() === id.toString());
    if (idx === -1) return null;
    db.users[idx] = {
      ...db.users[idx],
      ...updateFields,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.users[idx];
  },

  // Transactions
  getTransactions: async (userId, filter = {}, sort = { date: -1 }, skip = 0, limit = 10) => {
    const db = loadDb();
    let list = db.transactions.filter((t) => t.user.toString() === userId.toString());

    if (filter.type) {
      list = list.filter((t) => t.type === filter.type);
    }
    if (filter.category) {
      list = list.filter((t) => t.category === filter.category);
    }
    if (filter.startDate) {
      const s = new Date(filter.startDate).getTime();
      list = list.filter((t) => new Date(t.date).getTime() >= s);
    }
    if (filter.endDate) {
      const e = new Date(filter.endDate).getTime();
      list = list.filter((t) => new Date(t.date).getTime() <= e);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sort
    const sortField = Object.keys(sort)[0] || 'date';
    const sortOrder = sort[sortField] === 1 ? 1 : -1;
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    const totalCount = list.length;
    const paginated = limit ? list.slice(skip, skip + limit) : list;
    return { transactions: paginated, totalCount };
  },

  findTransactionById: async (id, userId) => {
    const db = loadDb();
    return db.transactions.find(
      (t) => t._id.toString() === id.toString() && t.user.toString() === userId.toString()
    ) || null;
  },

  createTransaction: async (data) => {
    const db = loadDb();
    const newTx = {
      _id: generateId(),
      user: data.user.toString(),
      title: data.title,
      type: data.type,
      amount: data.amount,
      category: data.category,
      date: new Date(data.date || new Date()).toISOString(),
      paymentMethod: data.paymentMethod || 'UPI',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.transactions.unshift(newTx);
    saveDb(db);
    return newTx;
  },

  updateTransaction: async (id, userId, updates) => {
    const db = loadDb();
    const idx = db.transactions.findIndex(
      (t) => t._id.toString() === id.toString() && t.user.toString() === userId.toString()
    );
    if (idx === -1) return null;

    db.transactions[idx] = {
      ...db.transactions[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.transactions[idx];
  },

  deleteTransaction: async (id, userId) => {
    const db = loadDb();
    const idx = db.transactions.findIndex(
      (t) => t._id.toString() === id.toString() && t.user.toString() === userId.toString()
    );
    if (idx === -1) return false;
    db.transactions.splice(idx, 1);
    saveDb(db);
    return true;
  },

  // Budgets
  getBudgets: async (userId, month, year) => {
    const db = loadDb();
    return db.budgets.filter(
      (b) =>
        b.user.toString() === userId.toString() &&
        b.month === parseInt(month, 10) &&
        b.year === parseInt(year, 10)
    );
  },

  findBudgetById: async (id, userId) => {
    const db = loadDb();
    return db.budgets.find(
      (b) => b._id.toString() === id.toString() && b.user.toString() === userId.toString()
    ) || null;
  },

  findExistingBudget: async (userId, category, month, year) => {
    const db = loadDb();
    return db.budgets.find(
      (b) =>
        b.user.toString() === userId.toString() &&
        b.category.toLowerCase() === category.toLowerCase() &&
        b.month === parseInt(month, 10) &&
        b.year === parseInt(year, 10)
    ) || null;
  },

  createBudget: async (data) => {
    const db = loadDb();
    const newBudget = {
      _id: generateId(),
      user: data.user.toString(),
      category: data.category,
      amount: data.amount,
      month: parseInt(data.month, 10),
      year: parseInt(data.year, 10),
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.budgets.push(newBudget);
    saveDb(db);
    return newBudget;
  },

  updateBudget: async (id, userId, updates) => {
    const db = loadDb();
    const idx = db.budgets.findIndex(
      (b) => b._id.toString() === id.toString() && b.user.toString() === userId.toString()
    );
    if (idx === -1) return null;
    db.budgets[idx] = {
      ...db.budgets[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.budgets[idx];
  },

  deleteBudget: async (id, userId) => {
    const db = loadDb();
    const idx = db.budgets.findIndex(
      (b) => b._id.toString() === id.toString() && b.user.toString() === userId.toString()
    );
    if (idx === -1) return false;
    db.budgets.splice(idx, 1);
    saveDb(db);
    return true;
  }
};

module.exports = dbStore;
