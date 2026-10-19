import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtPlain, fmtDate, uid } from '../../utils/formatters';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, TrendingUp, Trash2, Edit3 } from 'lucide-react';

export default function MetalsView() {
  const { data, updateData, showNotification } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [metal, setMetal] = useState('Gold'); // 'Gold' | 'Silver' | etc.
  const [side, setSide] = useState('buy'); // 'buy' | 'sell'
  const [broker, setBroker] = useState('');
  const [period, setPeriod] = useState('Lumpsum'); // 'Daily' | 'Lumpsum'
  const [qty, setQty] = useState(''); // grams
  const [rate, setRate] = useState(''); // ₹ / gram
  const [gst, setGst] = useState('');

  const [editingEntry, setEditingEntry] = useState(null);

  const amount = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return Math.round(q * r * 1e8) / 1e8;
  }, [qty, rate]);

  const total = useMemo(() => {
    const g = parseFloat(gst) || 0;
    if (side === 'buy') {
      return Math.round((amount + g) * 1e8) / 1e8;
    } else {
      return amount;
    }
  }, [amount, gst, side]);

  const entries = data?.metals || [];
  const savedBrokers = data?.metalBrokers || [];

  // Metal-wise P&L aggregation
  const metalPLMap = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const mName = e.metal || 'Gold';
      if (!map[mName]) {
        map[mName] = { buyQty: 0, sellQty: 0, buyValue: 0, sellValue: 0, lastBuyRate: 0 };
      }
      const m = map[mName];
      if (e.side === 'buy') {
        m.buyQty += Number(e.qty) || 0;
        m.buyValue += Number(e.total) || 0;
        m.lastBuyRate = Number(e.rate) || 0;
      } else {
        m.sellQty += Number(e.qty) || 0;
        m.sellValue += Number(e.total) || 0;
      }
    });

    Object.keys(map).forEach(k => {
      const d = map[k];
      d.balQty = d.buyQty - d.sellQty;
      d.balValue = d.balQty * d.lastBuyRate;
      d.pl = d.sellValue - (d.sellQty * d.lastBuyRate);
    });

    return map;
  }, [entries]);

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const cleanBroker = (broker || '').trim();
    const numQty = parseFloat(qty) || 0;
    const numRate = parseFloat(rate) || 0;

    if (!date || !metal || numQty <= 0 || numRate <= 0) {
      alert('Please fill Date, Metal, Qty (>0) and Rate (>0).');
      return;
    }

    const newEntry = {
      id: uid('mt'),
      date,
      metal,
      side,
      broker: cleanBroker,
      period,
      qty: numQty,
      rate: numRate,
      gst: side === 'buy' ? (parseFloat(gst) || 0) : 0,
      total
    };

    updateData(prev => {
      const next = { ...prev };
      next.metals = [newEntry, ...(next.metals || [])];
      if (cleanBroker && !next.metalBrokers?.includes(cleanBroker)) {
        next.metalBrokers = [...(next.metalBrokers || []), cleanBroker].sort();
      }
      return next;
    });

    showNotification(`Saved ${metal} ${side.toUpperCase()} entry`);

    setQty('');
    setRate('');
    setGst('');
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Delete this metal entry?')) return;
    updateData(prev => ({
      ...prev,
      metals: (prev.metals || []).filter(e => e.id !== id)
    }));
    showNotification('Metal entry deleted');
  };

  const handleUpdateEntry = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateData(prev => ({
      ...prev,
      metals: (prev.metals || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      )
    }));

    setEditingEntry(null);
    showNotification('Metal entry updated');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Metal', 'Side', 'Broker', 'Period', 'Qty (g)', 'Rate (₹/g)', 'GST (₹)', 'Total (₹)'];
    const rows = entries.map(e => [
      e.date,
      e.metal,
      (e.side || 'buy').toUpperCase(),
      e.broker || '',
      e.period,
      e.qty,
      e.rate,
      e.gst || 0,
      e.total
    ]);
    downloadCSV('metal_entries.csv', headers, rows);
  };

  return (
    <div className="viewContainer">
      {/* ADD METAL ENTRY FORM */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add Precious Metal Entry (Gold / Silver)</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Metal Type</label>
              <select value={metal} onChange={e => setMetal(e.target.value)}>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>

            <div className="fld">
              <label>Side</label>
              <div className="radioRow">
                <label className={`radioBtn ${side === 'buy' ? 'active buy' : ''}`}>
                  <input
                    type="radio"
                    name="mt_side"
                    value="buy"
                    checked={side === 'buy'}
                    onChange={() => setSide('buy')}
                  />
                  <span>BUY</span>
                </label>
                <label className={`radioBtn ${side === 'sell' ? 'active sell' : ''}`}>
                  <input
                    type="radio"
                    name="mt_side"
                    value="sell"
                    checked={side === 'sell'}
                    onChange={() => setSide('sell')}
                  />
                  <span>SELL</span>
                </label>
              </div>
            </div>

            <div className="fld">
              <label>Jeweller / Broker</label>
              <input
                type="text"
                list="metalBrokerList"
                placeholder="e.g. GRT, Tanishq, Malabar"
                value={broker}
                onChange={e => setBroker(e.target.value)}
              />
              <datalist id="metalBrokerList">
                {savedBrokers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>
          </div>

          <div className="grid cols4" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="Lumpsum">Lumpsum (One-Time)</option>
                <option value="Daily">Daily Plan</option>
              </select>
            </div>

            <div className="fld">
              <label>Quantity (Grams)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={qty}
                onChange={e => setQty(e.target.value)}
                required
              />
            </div>

            <div className="fld">
              <label>Rate (₹ / Gram)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={rate}
                onChange={e => setRate(e.target.value)}
                required
              />
            </div>

            {side === 'buy' ? (
              <div className="fld">
                <label>GST / Making Charges (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={gst}
                  onChange={e => setGst(e.target.value)}
                />
              </div>
            ) : (
              <div className="fld">
                <label>Amount (₹) [Qty × Rate]</label>
                <input type="text" readOnly value={fmtPlain(amount)} className="readonlyInput" />
              </div>
            )}
          </div>

          <div className="grid cols4" style={{ marginTop: 12 }}>
            <div className="fld" style={{ gridColumn: 'span 2' }}>
              <label style={{ color: 'var(--green-dark)', fontWeight: 700 }}>
                Net Total Amount (₹) {side === 'buy' ? '[(Qty × Rate) + GST]' : '[Qty × Rate]'}
              </label>
              <input
                type="text"
                readOnly
                value={fmtPlain(total)}
                className="readonlyInput"
                style={{ fontWeight: 800, color: 'var(--green-dark)', background: '#eef6ec' }}
              />
            </div>
          </div>

          {/* Saved Brokers */}
          <div style={{ marginTop: 14 }}>
            <div className="chipGroupLabel">Saved Jewellers / Brokers:</div>
            <div className="brokerChips">
              {savedBrokers.map(b => (
                <span key={b} className="brokerChip" onClick={() => setBroker(b)}>
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Save Metal Entry
            </button>
          </div>
        </form>
      </div>

      {/* METAL P&L CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#1f4d1f" />
            <span>Profit / Loss — Metals Summary</span>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Metal</th>
                <th>Buy Qty (g)</th>
                <th>Sell Qty (g)</th>
                <th>Balance Qty (g)</th>
                <th>Total Buy Value (₹)</th>
                <th>Total Sell Value (₹)</th>
                <th>Last Buy Rate (₹/g)</th>
                <th>Balance Value (₹)</th>
                <th>Profit / Loss (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(metalPLMap).length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty">No metal entries found.</td>
                </tr>
              ) : (
                Object.keys(metalPLMap).sort().map(m => {
                  const d = metalPLMap[m];
                  return (
                    <tr key={m}>
                      <td><strong>{m}</strong></td>
                      <td>{fmt(d.buyQty)} g</td>
                      <td>{fmt(d.sellQty)} g</td>
                      <td><strong>{fmt(d.balQty)} g</strong></td>
                      <td>{fmt(d.buyValue)}</td>
                      <td>{fmt(d.sellValue)}</td>
                      <td>{fmt(d.lastBuyRate)}</td>
                      <td><strong>{fmt(d.balValue)}</strong></td>
                      <td className={d.pl >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
                        {fmt(d.pl)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED ENTRIES LIST */}
      <div className="card">
        <div className="cardTitle">
          <span>Metal Entries ({entries.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF('Metals Entries', '#metalTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        <div className="tableWrap" id="metalTable">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Metal</th>
                <th>Side</th>
                <th>Jeweller / Broker</th>
                <th>Period</th>
                <th>Qty (g)</th>
                <th>Rate (₹/g)</th>
                <th>GST (₹)</th>
                <th>Total (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty">No metal entries yet.</td>
                </tr>
              ) : (
                entries.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td><strong>{e.metal}</strong></td>
                    <td><span className={`tag ${e.side}`}>{e.side.toUpperCase()}</span></td>
                    <td>{e.broker || '—'}</td>
                    <td><span className="tag system">{e.period || 'Lumpsum'}</span></td>
                    <td>{fmt(e.qty)}</td>
                    <td>{fmt(e.rate)}</td>
                    <td>{e.side === 'buy' ? fmt(e.gst || 0) : '—'}</td>
                    <td><strong>{fmt(e.total)}</strong></td>
                    <td>
                      <button
                        className="btn small secondary"
                        style={{ marginRight: 6 }}
                        onClick={() => setEditingEntry(e)}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        className="btn small danger"
                        onClick={() => handleDeleteEntry(e.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingEntry && (
        <div className="modalOverlay active">
          <div className="modalBox">
            <h3 className="modalTitle">Edit Metal Entry</h3>
            <form onSubmit={handleUpdateEntry}>
              <div className="grid cols2" style={{ marginTop: 12 }}>
                <div className="fld">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={e => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Metal</label>
                  <select
                    value={editingEntry.metal}
                    onChange={e => setEditingEntry({ ...editingEntry, metal: e.target.value })}
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
                <div className="fld">
                  <label>Side</label>
                  <select
                    value={editingEntry.side}
                    onChange={e => setEditingEntry({ ...editingEntry, side: e.target.value })}
                  >
                    <option value="buy">BUY</option>
                    <option value="sell">SELL</option>
                  </select>
                </div>
                <div className="fld">
                  <label>Broker / Jeweller</label>
                  <input
                    type="text"
                    value={editingEntry.broker || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, broker: e.target.value })}
                  />
                </div>
                <div className="fld">
                  <label>Quantity (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.qty}
                    onChange={e => {
                      const q = parseFloat(e.target.value) || 0;
                      const r = parseFloat(editingEntry.rate) || 0;
                      const g = parseFloat(editingEntry.gst) || 0;
                      const tot = editingEntry.side === 'buy' ? (q * r) + g : (q * r);
                      setEditingEntry({ ...editingEntry, qty: q, total: tot });
                    }}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Rate (₹/g)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.rate}
                    onChange={e => {
                      const r = parseFloat(e.target.value) || 0;
                      const q = parseFloat(editingEntry.qty) || 0;
                      const g = parseFloat(editingEntry.gst) || 0;
                      const tot = editingEntry.side === 'buy' ? (q * r) + g : (q * r);
                      setEditingEntry({ ...editingEntry, rate: r, total: tot });
                    }}
                    required
                  />
                </div>
                {editingEntry.side === 'buy' && (
                  <div className="fld">
                    <label>GST (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingEntry.gst || 0}
                      onChange={e => {
                        const g = parseFloat(e.target.value) || 0;
                        const q = parseFloat(editingEntry.qty) || 0;
                        const r = parseFloat(editingEntry.rate) || 0;
                        setEditingEntry({ ...editingEntry, gst: g, total: (q * r) + g });
                      }}
                    />
                  </div>
                )}
                <div className="fld">
                  <label>Total (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.total}
                    onChange={e => setEditingEntry({ ...editingEntry, total: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setEditingEntry(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
