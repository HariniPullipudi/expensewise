/**
 * Currency utility helpers for formatting numbers consistently.
 * Default is Indian Rupee (INR) with Indian numbering format (e.g. ₹25,000.00).
 */

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

const formatCurrency = (amount, currency = 'INR') => {
  const numericAmount = Number(amount) || 0;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (error) {
    const symbol = CURRENCY_SYMBOLS[currency] || '₹';
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
};

module.exports = {
  CURRENCY_SYMBOLS,
  formatCurrency
};
