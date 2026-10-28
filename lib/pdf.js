import { BUSINESS } from './business';
import { amountInWords, calcTotals, displayDate, money } from './utils';

// Builds the invoice PDF (A4) in the same layout as the original sample.
export async function buildInvoicePdf(inv) {
  const { jsPDF } = await import('jspdf');
  const atMod = await import('jspdf-autotable');
  const autoTable = [atMod.default, atMod.default && atMod.default.default, atMod.autoTable].find(
    (f) => typeof f === 'function'
  );

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  let y = 16;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TAX INVOICE', W / 2, y, { align: 'center' });
  y += 9;

  // Business block
  doc.setFontSize(14);
  doc.text(BUSINESS.name, M, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Legal Name: ${BUSINESS.legalName}`, M, y);
  y += 5;
  const addr = doc.splitTextToSize(BUSINESS.address, W - 2 * M);
  doc.text(addr, M, y);
  y += addr.length * 4.6;
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${BUSINESS.gstin}`, M, y);
  y += 4;

  doc.setDrawColor(150);
  doc.line(M, y, W - M, y);
  y += 6;

  // Invoice meta
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No.: ${inv.invoiceNo}`, M, y);
  doc.text(`Invoice Date: ${displayDate(inv.date)}`, W - M, y, { align: 'right' });
  y += 5.5;
  doc.text(`Place of Supply: ${inv.placeOfSupply}`, M, y);
  y += 4;
  doc.line(M, y, W - M, y);
  y += 6;

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill To', M, y);
  y += 5.5;
  doc.setFontSize(10);
  const field = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, M, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || '', W - 2 * M - 38);
    doc.text(lines.length ? lines : [''], M + 38, y);
    y += Math.max(1, lines.length) * 4.8 + 0.6;
  };
  field('Customer Name:', inv.customerName);
  field('Customer Address:', inv.customerAddress);
  field('Customer GSTIN:', inv.customerGstin);
  y += 1;

  // Items table
  const body = inv.items.map((it, i) => {
    const amount = (Number(it.qty) || 0) * (Number(it.rate) || 0);
    return [
      String(i + 1),
      it.description,
      it.packing,
      String(Number(it.qty) || 0),
      money(it.rate),
      `${Number(it.tax) || 0}%`,
      money(amount),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Sr.', 'Description of Goods', 'Packing', 'Qty', 'Rate (Rs.)', 'Tax', 'Amount (Rs.)']],
    body,
    theme: 'grid',
    margin: { left: M, right: M },
    styles: { fontSize: 9.5, cellPadding: 2.2, lineColor: [150, 150, 150], textColor: 20 },
    headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' },
      3: { halign: 'right', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 30 },
    },
  });

  y = doc.lastAutoTable.finalY + 7;

  // Totals
  const { subtotal, gst, total } = calcTotals(inv.items);
  const labelX = W - M - 62;
  const row = (label, value, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11.5 : 10);
    doc.text(label, labelX, y);
    doc.text(value, W - M, y, { align: 'right' });
    y += bold ? 7 : 5.5;
  };
  row('Subtotal', money(subtotal));
  row(gst > 0 ? 'GST' : 'GST (Nil / 0%)', money(gst));
  doc.line(labelX, y - 3.5, W - M, y - 3.5);
  row('TOTAL', money(total), true);

  // Amount in words
  y += 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', M, y);
  doc.setFont('helvetica', 'normal');
  const words = doc.splitTextToSize(amountInWords(total), W - 2 * M - 34);
  doc.text(words, M + 34, y);
  y += words.length * 4.8 + 6;

  // Declaration
  if (gst === 0) {
    doc.setFontSize(9);
    const decl = doc.splitTextToSize(`Declaration: ${BUSINESS.nilDeclaration}`, W - 2 * M - 70);
    doc.text(decl, M, y);
  }

  // Signature
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${BUSINESS.name}`, W - M, y, { align: 'right' });
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', W - M, y, { align: 'right' });

  return doc;
}

export function invoiceFileName(inv) {
  return `Invoice_${inv.invoiceNo.replace(/\//g, '-')}.pdf`;
}
