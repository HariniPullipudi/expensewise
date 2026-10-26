/**
 * CSV Generation Utility
 * Features:
 * - Proper escaping of quotes, commas, and newlines.
 * - Robust protection against Spreadsheet Formula Injection (CWE-1236 / CSV Injection):
 *   Prefixes any cell starting with '=', '+', '-', '@', '\t', '\r' with an apostrophe.
 */

const sanitizeCsvField = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Formula injection defense: prefix dangerous leading characters with a single quote (')
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');

  // Enclose all fields in quotes
  return `"${escaped}"`;
};

const generateTransactionsCsv = (transactions = []) => {
  const headers = [
    'Transaction ID',
    'Date',
    'Title',
    'Type',
    'Category',
    'Amount',
    'Payment Method',
    'Notes'
  ];

  const headerRow = headers.map(sanitizeCsvField).join(',');

  const rows = transactions.map((tx) => {
    const formattedDate = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
    const formattedType = tx.type ? tx.type.toUpperCase() : '';
    const formattedAmount = Number(tx.amount || 0).toFixed(2);

    return [
      tx._id ? tx._id.toString() : '',
      formattedDate,
      tx.title || '',
      formattedType,
      tx.category || '',
      formattedAmount,
      tx.paymentMethod || 'UPI',
      tx.notes || ''
    ]
      .map(sanitizeCsvField)
      .join(',');
  });

  // Prepend UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 text with rupee symbols properly
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
};

module.exports = {
  sanitizeCsvField,
  generateTransactionsCsv
};
