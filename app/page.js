'use client';

import { useEffect, useMemo, useState } from 'react';
import { BUSINESS } from '../lib/business';
import { buildInvoicePdf, invoiceFileName } from '../lib/pdf';
import {
  amountInWords,
  calcTotals,
  money,
  nextInvoiceNo,
  todayISO,
} from '../lib/utils';

const HISTORY_KEY = 'ru_invoice_history_v1';

const blankItem = () => ({ description: '', packing: '', qty: '', rate: '', tax: 0 });

const blankInvoice = (history = []) => {
  const date = todayISO();
  return {
    invoiceNo: nextInvoiceNo(history, date),
    date,
    placeOfSupply: BUSINESS.defaultPlace,
    customerName: '',
    customerAddress: '',
    customerGstin: '',
    items: [blankItem()],
  };
};

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function Home() {
  const [inv, setInv] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('new');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setInv(blankInvoice(h));
  }, []);

  // Beautiful 3-second splash loader on first load
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const totals = useMemo(() => (inv ? calcTotals(inv.items) : { subtotal: 0, gst: 0, total: 0 }), [inv]);

  const showLoader = !inv || !ready;

  if (showLoader) return (
    <div className="loader">
      <div className="spinner" />
      <h2 className="loaderTitle">R U Traders</h2>
      <p className="loaderSub">Invoice Generator</p>
    </div>
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const set = (k, v) => setInv((p) => ({ ...p, [k]: v }));
  const setItem = (i, k, v) =>
    setInv((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setInv((p) => ({ ...p, items: [...p.items, blankItem()] }));
  const removeItem = (i) =>
    setInv((p) => ({ ...p, items: p.items.length > 1 ? p.items.filter((_, idx) => idx !== i) : p.items }));

  const validate = () => {
    if (!inv.invoiceNo.trim()) return 'Invoice number daalo';
    if (!inv.customerName.trim()) return 'Customer name daalo';
    const ok = inv.items.filter((it) => it.description.trim() && Number(it.qty) > 0 && Number(it.rate) >= 0);
    if (!ok.length) return 'Kam se kam ek item (description, qty, rate) daalo';
    return '';
  };

  const cleanInvoice = () => ({
    ...inv,
    items: inv.items.filter((it) => it.description.trim() && Number(it.qty) > 0),
  });

  const saveToHistory = (invoice) => {
    const others = history.filter((h) => h.invoiceNo !== invoice.invoiceNo);
    const next = [{ ...invoice, savedAt: Date.now() }, ...others].slice(0, 100);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
    return next;
  };

  const startNew = (h = history) => {
    setInv(blankInvoice(h));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = async () => {
    const err = validate();
    if (err) return showToast(err);
    setBusy(true);
    try {
      const invoice = cleanInvoice();
      const doc = await buildInvoicePdf(invoice);
      doc.save(invoiceFileName(invoice));
      const h = saveToHistory(invoice);
      showToast('PDF download ho gaya');
      startNew(h);
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const err = validate();
    if (err) return showToast(err);
    setBusy(true);
    try {
      const invoice = cleanInvoice();
      const doc = await buildInvoicePdf(invoice);
      const name = invoiceFileName(invoice);
      const file = new File([doc.output('blob')], name, { type: 'application/pdf' });
      const h = saveToHistory(invoice);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoice.invoiceNo}`,
            text: `Invoice ${invoice.invoiceNo} - R U Traders - Rs. ${money(calcTotals(invoice.items).total)}`,
          });
          startNew(h);
        } catch (e) {
          if (e && e.name !== 'AbortError') showToast('Share nahi ho paya');
        }
      } else {
        doc.save(name);
        showToast('Is browser me share nahi hota, PDF download kar di');
        startNew(h);
      }
    } finally {
      setBusy(false);
    }
  };

  const redownload = async (h, share) => {
    const doc = await buildInvoicePdf(h);
    const name = invoiceFileName(h);
    if (share) {
      const file = new File([doc.output('blob')], name, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Invoice ${h.invoiceNo}` });
        } catch {}
        return;
      }
    }
    doc.save(name);
  };

  const editFromHistory = (h) => {
    const { savedAt, ...rest } = h;
    setInv(rest);
    setTab('new');
    window.scrollTo({ top: 0 });
  };

  const duplicateFromHistory = (h) => {
    const { savedAt, ...rest } = h;
    setInv({ ...rest, invoiceNo: nextInvoiceNo(history, todayISO()), date: todayISO() });
    setTab('new');
    window.scrollTo({ top: 0 });
  };

  const deleteFromHistory = (no) => {
    if (!confirm(`Invoice ${no} delete karein?`)) return;
    const next = history.filter((h) => h.invoiceNo !== no);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>{BUSINESS.name}</h1>
          <p className="muted small">GSTIN: {BUSINESS.gstin}</p>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>New Invoice</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
          History ({history.length})
        </button>
      </nav>

      {tab === 'new' && (
        <>
          <section className="card">
            <h2>Invoice Details</h2>
            <div className="grid2">
              <label>
                Invoice No.
                <input value={inv.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} />
              </label>
              <label>
                Invoice Date
                <input type="date" value={inv.date} onChange={(e) => set('date', e.target.value)} />
              </label>
            </div>
            <label>
              Place of Supply
              <input value={inv.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)} />
            </label>
          </section>

          <section className="card">
            <h2>Bill To</h2>
            <label>
              Customer Name
              <input
                value={inv.customerName}
                onChange={(e) => set('customerName', e.target.value)}
                placeholder="Customer ka naam"
                autoComplete="off"
              />
            </label>
            <label>
              Customer Address
              <textarea
                rows={2}
                value={inv.customerAddress}
                onChange={(e) => set('customerAddress', e.target.value)}
                placeholder="Address"
              />
            </label>
            <label>
              Customer GSTIN (optional)
              <input
                value={inv.customerGstin}
                onChange={(e) => set('customerGstin', e.target.value.toUpperCase())}
                placeholder="GSTIN"
                autoCapitalize="characters"
              />
            </label>
          </section>

          <section className="card">
            <h2>Items</h2>
            {inv.items.map((it, i) => {
              const amount = (Number(it.qty) || 0) * (Number(it.rate) || 0);
              return (
                <div className="item" key={i}>
                  <div className="itemHead">
                    <strong>Item {i + 1}</strong>
                    {inv.items.length > 1 && (
                      <button className="link danger" onClick={() => removeItem(i)}>Remove</button>
                    )}
                  </div>
                  <label>
                    Description of Goods
                    <input
                      value={it.description}
                      onChange={(e) => setItem(i, 'description', e.target.value.toUpperCase())}
                      placeholder="e.g. TEJAL TON"
                      autoCapitalize="characters"
                    />
                  </label>
                  <label>
                    Packing
                    <input
                      value={it.packing}
                      onChange={(e) => setItem(i, 'packing', e.target.value)}
                      placeholder="e.g. 25 KG × 25 Bags"
                    />
                  </label>
                  <div className="grid3">
                    <label>
                      Qty
                      <input
                        type="number"
                        inputMode="decimal"
                        value={it.qty}
                        onChange={(e) => setItem(i, 'qty', e.target.value)}
                      />
                    </label>
                    <label>
                      Rate (₹)
                      <input
                        type="number"
                        inputMode="decimal"
                        value={it.rate}
                        onChange={(e) => setItem(i, 'rate', e.target.value)}
                      />
                    </label>
                    <label>
                      Tax %
                      <input
                        type="number"
                        inputMode="decimal"
                        value={it.tax}
                        onChange={(e) => setItem(i, 'tax', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="amountRow">
                    <span className="muted">Amount</span>
                    <strong>₹ {money(amount)}</strong>
                  </div>
                </div>
              );
            })}
            <button className="btn ghost" onClick={addItem}>+ Add Item</button>
          </section>

          <section className="card totals">
            <div><span>Subtotal</span><strong>₹ {money(totals.subtotal)}</strong></div>
            <div><span>{totals.gst > 0 ? 'GST' : 'GST (Nil / 0%)'}</span><strong>₹ {money(totals.gst)}</strong></div>
            <div className="grand"><span>TOTAL</span><strong>₹ {money(totals.total)}</strong></div>
            <p className="muted small">{amountInWords(totals.total)}</p>
          </section>

          <div className="spacer" />
          <div className="actionBar">
            <button className="btn primary" disabled={busy} onClick={handleDownload}>
              {busy ? 'Wait...' : 'Download PDF'}
            </button>
            <button className="btn accent" disabled={busy} onClick={handleShare}>
              Share
            </button>
          </div>
        </>
      )}

      {tab === 'history' && (
        <section>
          {history.length === 0 && <p className="muted center">Abhi tak koi invoice nahi bana.</p>}
          {history.map((h) => (
            <div className="card hist" key={h.invoiceNo}>
              <div className="histTop">
                <strong>{h.invoiceNo}</strong>
                <strong>₹ {money(calcTotals(h.items).total)}</strong>
              </div>
              <p className="muted small">
                {h.customerName || '—'} · {h.date.split('-').reverse().join('/')}
              </p>
              <div className="histBtns">
                <button className="chip" onClick={() => redownload(h, false)}>PDF</button>
                <button className="chip" onClick={() => redownload(h, true)}>Share</button>
                <button className="chip" onClick={() => editFromHistory(h)}>Edit</button>
                <button className="chip" onClick={() => duplicateFromHistory(h)}>Copy</button>
                <button className="chip danger" onClick={() => deleteFromHistory(h.invoiceNo)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}

      <footer className="footer">
        Developed by{' '}
        <a
          href="https://altamash-shaikh-portfolio.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <strong>Altamash Shaikh</strong>
        </a>
      </footer>
    </main>
  );
}
