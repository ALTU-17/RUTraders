import { BUSINESS } from './business';

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n) {
  let s = '';
  if (n >= 100) {
    s += ones[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n) s += ' ';
  }
  if (n >= 20) {
    s += tens[Math.floor(n / 10)];
    if (n % 10) s += ' ' + ones[n % 10];
  } else if (n > 0) {
    s += ones[n];
  }
  return s;
}

function intToWordsIndian(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(below1000(crore) + ' Crore');
  if (lakh) parts.push(below1000(lakh) + ' Lakh');
  if (thousand) parts.push(below1000(thousand) + ' Thousand');
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}

export function amountInWords(amount) {
  const total = Math.round((Number(amount) || 0) * 100);
  const rupees = Math.floor(total / 100);
  const paise = total % 100;
  let s = 'Rupees ' + intToWordsIndian(rupees);
  if (paise) s += ' and ' + intToWordsIndian(paise) + ' Paise';
  return s + ' Only';
}

export function money(n) {
  return (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function displayDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Indian financial year, e.g. 2026-27 for dates Apr 2026 - Mar 2027
export function financialYear(iso) {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function nextInvoiceNo(history, iso) {
  const fy = financialYear(iso);
  const prefix = `${BUSINESS.prefix}/${fy}/`;
  let max = 0;
  for (const inv of history) {
    if (inv.invoiceNo && inv.invoiceNo.startsWith(prefix)) {
      const n = parseInt(inv.invoiceNo.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return prefix + String(max + 1).padStart(3, '0');
}

export function calcTotals(items) {
  let subtotal = 0;
  let gst = 0;
  for (const it of items) {
    const amount = (Number(it.qty) || 0) * (Number(it.rate) || 0);
    subtotal += amount;
    gst += (amount * (Number(it.tax) || 0)) / 100;
  }
  return { subtotal, gst, total: subtotal + gst };
}
