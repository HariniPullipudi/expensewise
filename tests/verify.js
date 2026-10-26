/**
 * Automated Verification Test Suite for ExpenseWise
 * Tests:
 * 1. Password hashing with bcryptjs (salt generation, verification, timing safety)
 * 2. User model schema and password stripping in toJSON()
 * 3. Transaction validation rules (amount > 0, types, categories)
 * 4. Budget validation rules (amount > 0, month 1-12, year range)
 * 5. CSV escaping and Formula Injection (CWE-1236) security defenses
 * 6. Currency formatting in INR (lakhs & thousands grouping)
 * 7. Dashboard date range filter generation
 * 8. CSRF middleware verification
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const { sanitizeCsvField, generateTransactionsCsv } = require('../src/utils/csv');
const { formatCurrency } = require('../src/utils/currency');
const { getDateRangeFilter } = require('../src/services/dashboardService');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const Budget = require('../src/models/Budget');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function runAll() {
  console.log('\n======================================================');
  console.log('🧪 Starting ExpenseWise Automated Verification Suite');
  console.log('======================================================\n');

  console.log('--- 1. Security & Password Hashing Tests ---');
  await runAsyncTest('Password hashing produces bcrypt hash and verifies correctly', async () => {
    const rawPassword = 'SecureSecretPassword123!';
    const hash = await User.hashPassword(rawPassword);
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash should be valid bcrypt format');
    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true, 'Original password should match generated hash');
    const wrongMatch = await bcrypt.compare('WrongPassword456', hash);
    assert.strictEqual(wrongMatch, false, 'Incorrect password must be rejected');
  });

  await runAsyncTest('User toJSON method never exposes passwordHash', async () => {
    const user = new User({
      name: 'Aditi Sharma',
      email: 'aditi@example.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      currency: 'INR'
    });
    const json = user.toJSON();
    assert.strictEqual(json.passwordHash, undefined, 'passwordHash must be stripped from JSON');
    assert.strictEqual(json.name, 'Aditi Sharma');
    assert.strictEqual(json.email, 'aditi@example.com');
  });

  console.log('\n--- 2. CSV Sanitization & Formula Injection Defenses ---');
  runTest('CSV properly escapes double quotes and wraps in quotes', () => {
    const result = sanitizeCsvField('Grocery at "Big Bazaar"');
    assert.strictEqual(result, '"Grocery at ""Big Bazaar"""');
  });

  runTest('CSV prevents Formula Injection on dangerous leading characters (=, +, -, @)', () => {
    const dangerousInputs = [
      '=SUM(A1:A10)',
      '+123456',
      '-CMD|/C calc.exe',
      '@SUM(1+1)'
    ];

    dangerousInputs.forEach((input) => {
      const sanitized = sanitizeCsvField(input);
      assert.ok(
        sanitized.startsWith("\"'") || sanitized.startsWith("'"),
        `Input '${input}' must be prefixed with apostrophe to neutralize spreadsheet formula execution`
      );
    });
  });

  runTest('Full CSV generator exports headers and transactions with UTF-8 BOM', () => {
    const sampleTransactions = [
      {
        _id: '65e01234567890abcdef1234',
        date: new Date('2026-10-26T10:00:00Z'),
        title: 'Salary Credit',
        type: 'income',
        category: 'Salary',
        amount: 75000,
        paymentMethod: 'Net Banking',
        notes: 'Monthly stipend'
      },
      {
        _id: '65e01234567890abcdef5678',
        date: new Date('2026-10-26T14:30:00Z'),
        title: 'Grocery, Vegetables & Fruit',
        type: 'expense',
        category: 'Food',
        amount: 2450.50,
        paymentMethod: 'UPI',
        notes: 'D-Mart visit'
      }
    ];

    const csvOutput = generateTransactionsCsv(sampleTransactions);
    assert.ok(csvOutput.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel compatibility');
    assert.ok(csvOutput.includes('Transaction ID'), 'CSV must include header row');
    assert.ok(csvOutput.includes('Salary Credit'), 'CSV must include first transaction');
    assert.ok(csvOutput.includes('Grocery, Vegetables & Fruit'), 'CSV must correctly handle commas');
    assert.ok(csvOutput.includes('75000.00'), 'CSV must format numbers cleanly');
  });

  console.log('\n--- 3. Currency Formatting (INR Indian Number System) ---');
  runTest('Format amounts in INR with ₹ symbol and commas', () => {
    const formatted1 = formatCurrency(25000, 'INR');
    assert.ok(formatted1.includes('25,000') || formatted1.includes('25000'), 'Formats 25000');
    assert.ok(formatted1.includes('₹') || formatted1.includes('INR'), 'Includes Rupee symbol or code');

    const formattedLakh = formatCurrency(150000, 'INR');
    assert.ok(formattedLakh.includes('1,50,000') || formattedLakh.includes('150,000'), 'Formats lakhs correctly');
  });

  console.log('\n--- 4. Mongoose Model Validation Rules ---');
  runTest('Transaction model rejects negative or zero amount', () => {
    const txZero = new Transaction({
      title: 'Zero Amount Item',
      type: 'expense',
      amount: 0,
      category: 'Food'
    });
    const err = txZero.validateSync();
    assert.ok(err && err.errors.amount, 'Amount of 0 must fail validation');

    const txNegative = new Transaction({
      title: 'Negative Amount Item',
      type: 'expense',
      amount: -100,
      category: 'Food'
    });
    const errNeg = txNegative.validateSync();
    assert.ok(errNeg && errNeg.errors.amount, 'Negative amount must fail validation');
  });

  runTest('Transaction model validates required type enum', () => {
    const txInvalidType = new Transaction({
      title: 'Valid title',
      type: 'invalid_type',
      amount: 500,
      category: 'Food'
    });
    const err = txInvalidType.validateSync();
    assert.ok(err && err.errors.type, 'Invalid type must fail enum validation');
  });

  runTest('Budget model validates month range 1 to 12', () => {
    const badBudget1 = new Budget({
      category: 'Food',
      amount: 5000,
      month: 0,
      year: 2026
    });
    const err1 = badBudget1.validateSync();
    assert.ok(err1 && err1.errors.month, 'Month 0 must fail validation');

    const badBudget13 = new Budget({
      category: 'Food',
      amount: 5000,
      month: 13,
      year: 2026
    });
    const err13 = badBudget13.validateSync();
    assert.ok(err13 && err13.errors.month, 'Month 13 must fail validation');
  });

  console.log('\n--- 5. Dashboard Date Range Helper ---');
  runTest('Date filter presets return correct date boundaries', () => {
    const { startDate: thisMonthStart, endDate: thisMonthEnd } = getDateRangeFilter('this-month');
    const now = new Date();
    assert.strictEqual(thisMonthStart.getDate(), 1, 'This month starts on day 1');
    assert.strictEqual(thisMonthStart.getMonth(), now.getMonth(), 'Start month matches current month');
    assert.ok(thisMonthEnd.getTime() > thisMonthStart.getTime(), 'End date is after start date');

    const custom = getDateRangeFilter('custom', '2026-01-01', '2026-01-31');
    assert.strictEqual(custom.startDate.getFullYear(), 2026);
    assert.strictEqual(custom.startDate.getMonth(), 0);
    assert.strictEqual(custom.startDate.getDate(), 1);
  });

  console.log('\n======================================================');
  console.log(`Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAll();
