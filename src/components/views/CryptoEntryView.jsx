import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtPlain, fmtDate, uid } from '../../utils/formatters';
import { computeScriptPL } from '../../utils/plCalculations';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, TrendingUp, Sparkles, Trash2, Edit3, Paperclip, X } from 'lucide-react';

export default function CryptoEntryView() {
  const { data, updateData, setActiveModal, setModalPayload, showNotification } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [script, setScript] = useState('');
  const [broker, setBroker] = useState('');
  const [side, setSide] = useState('buy'); // 'buy' | 'sell'
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [fees, setFees] = useState('');
  const [igst, setIgst] = useState('');
  const [tds, setTds] = useState('');
  const [attachment, setAttachment] = useState(null);

  // Filters
  const [filterBroker, setFilterBroker] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedNextLevelScript, setSelectedNextLevelScript] = useState(null);

  // Auto-calculated fields
  const amount = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return Math.round(q * r * 1e8) / 1e8;
  }, [qty, rate]);

  const total = useMemo(() => {
    const f = parseFloat(fees) || 0;
    const g = parseFloat(igst) || 0;
    const t = parseFloat(tds) || 0;
    if (side === 'buy') {
      return Math.round((amount + f + g) * 1e8) / 1e8;
    } else {
      return Math.round((amount - f - g - t) * 1e8) / 1e8;
    }
  }, [amount, fees, igst, tds, side]);

  const savedScripts = data?.savedCryptoScripts || data?.scripts || [];
  const savedBrokers = data?.savedCryptoBrokers || data?.brokers || [];
  const entries = data?.cryptoEntries || [];

  // Filtered entries for table and P&L
  const filteredEntries = useMemo(() => {
    if (!filterBroker) return entries;
    return entries.filter(e => (e.broker || '').toLowerCase() === filterBroker.toLowerCase());
  }, [entries, filterBroker]);

  const scriptPLMap = useMemo(() => {
    return computeScriptPL(filteredEntries);
  }, [filteredEntries]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment(ev.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const cleanScript = (script || '').trim().toUpperCase();
    const cleanBroker = (broker || '').trim();
    const numQty = parseFloat(qty) || 0;
    const numRate = parseFloat(rate) || 0;

    if (!date || !cleanScript || numQty <= 0 || numRate <= 0) {
      alert('Please fill Date, Script, Qty (>0) and Rate (>0).');
      return;
    }

    const newEntry = {
      id: uid('e'),
      date,
      script: cleanScript,
      broker: cleanBroker,
      side,
      market: 'crypto',
      qty: numQty,
      rate: numRate,
      amount,
      fees: parseFloat(fees) || 0,
      igst: parseFloat(igst) || 0,
      tds: side === 'sell' ? (parseFloat(tds) || 0) : 0,
      total,
      attachment
    };

    updateData(prev => {
      const next = { ...prev };
      next.cryptoEntries = [newEntry, ...(next.cryptoEntries || [])];

      // Also maintain spotEntries for backward compatibility
      next.spotEntries = [newEntry, ...(next.spotEntries || [])];

      // Register script
      if (!next.savedCryptoScripts?.includes(cleanScript)) {
        next.savedCryptoScripts = [...(next.savedCryptoScripts || []), cleanScript].sort();
      }
      if (!next.scripts?.includes(cleanScript)) {
        next.scripts = [...(next.scripts || []), cleanScript].sort();
      }

      // Register broker
      if (cleanBroker) {
        if (!next.savedCryptoBrokers?.includes(cleanBroker)) {
          next.savedCryptoBrokers = [...(next.savedCryptoBrokers || []), cleanBroker].sort();
        }
        if (!next.brokers?.includes(cleanBroker)) {
          next.brokers = [...(next.brokers || []), cleanBroker].sort();
        }
      }

      return next;
    });

    showNotification(`Saved ${side.toUpperCase()} entry for ${cleanScript}`);

    // Reset form fields
    setQty('');
    setRate('');
    setFees('');
    setIgst('');
    setTds('');
    setAttachment(null);
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Are you sure you want to delete this crypto entry?')) return;
    updateData(prev => ({
      ...prev,
      cryptoEntries: (prev.cryptoEntries || []).filter(e => e.id !== id),
      spotEntries: (prev.spotEntries || []).filter(e => e.id !== id)
    }));
    showNotification('Crypto entry deleted');
  };

  const handleUpdateEntry = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateData(prev => {
      const next = { ...prev };
      next.cryptoEntries = (next.cryptoEntries || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      );
      next.spotEntries = (next.spotEntries || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      );
      return next;
    });

    setEditingEntry(null);
    showNotification('Crypto entry updated');
  };

  const handleDeleteScriptChip = (scriptToDelete) => {
    updateData(prev => ({
      ...prev,
      savedCryptoScripts: (prev.savedCryptoScripts || []).filter(s => s !== scriptToDelete),
      scripts: (prev.scripts || []).filter(s => s !== scriptToDelete)
    }));
  };

  const handleDeleteBrokerChip = (brokerToDelete) => {
    updateData(prev => ({
      ...prev,
      savedCryptoBrokers: (prev.savedCryptoBrokers || []).filter(b => b !== brokerToDelete),
      brokers: (prev.brokers || []).filter(b => b !== brokerToDelete)
    }));
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Script', 'Side', 'Broker', 'Qty', 'Rate', 'Amount', 'Fees', 'IGST', 'TDS', 'Total'];
    const rows = entries.map(e => [
      e.date,
      e.script,
      (e.side || 'buy').toUpperCase(),
      e.broker || '',
      e.qty,
      e.rate,
      e.amount || (e.qty * e.rate),
      e.fees || 0,
      e.igst || 0,
      e.tds || 0,
      e.total
    ]);
    downloadCSV('crypto_entries.csv', headers, rows);
  };

  // Next Levels calculations for target sell prices (+12.5%)
  const unsoldScripts = useMemo(() => {
    return Object.keys(scriptPLMap).filter(s => scriptPLMap[s].balQty > 0.000001).sort();
  }, [scriptPLMap]);

  const nextLevelDetail = useMemo(() => {
    if (!selectedNextLevelScript) return null;
    const buys = entries.filter(e => e.script === selectedNextLevelScript && e.side === 'buy')
      .sort((a, b) => a.date.localeCompare(b.date));
    const totalSellQty = entries.filter(e => e.script === selectedNextLevelScript && e.side === 'sell')
      .reduce((s, e) => s + (e.qty || 0), 0);

    let remainingSell = totalSellQty;
    const levels = [];

    buys.forEach(b => {
      let activeQty = b.qty;
      if (remainingSell > 0) {
        if (remainingSell >= activeQty) {
          remainingSell -= activeQty;
          activeQty = 0;
        } else {
          activeQty -= remainingSell;
          remainingSell = 0;
        }
      }
      if (activeQty > 0.000001) {
        const targetRate = b.rate * 1.125; // +12.5%
        const targetTotal = activeQty * targetRate;
        const profit = targetTotal - (activeQty * b.rate);
        levels.push({
          date: b.date,
          qty: activeQty,
          buyRate: b.rate,
          targetRate,
          targetTotal,
          profit
        });
      }
    });

    return { script: selectedNextLevelScript, levels };
  }, [entries, selectedNextLevelScript]);

  return (
    <div className="viewContainer">
      {/* ADD CRYPTO ENTRY FORM */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add Crypto Entry</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Script (e.g. INR-BTC, INR-ETH, INR-SOL)</label>
              <input
                type="text"
                list="cryptoScriptList"
                placeholder="INR-BTC"
                value={script}
                onChange={e => setScript(e.target.value)}
                required
              />
              <datalist id="cryptoScriptList">
                {savedScripts.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Broker / Exchange</label>
              <input
                type="text"
                list="cryptoBrokerList"
                placeholder="Coinswitch, CoinDCX, WazirX"
                value={broker}
                onChange={e => setBroker(e.target.value)}
              />
              <datalist id="cryptoBrokerList">
                {savedBrokers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Side</label>
              <div className="radioRow">
                <label className={`radioBtn ${side === 'buy' ? 'active buy' : ''}`}>
                  <input
                    type="radio"
                    name="cr_side"
                    value="buy"
                    checked={side === 'buy'}
                    onChange={() => setSide('buy')}
                  />
                  <span>BUY</span>
                </label>
                <label className={`radioBtn ${side === 'sell' ? 'active sell' : ''}`}>
                  <input
                    type="radio"
                    name="cr_side"
                    value="sell"
                    checked={side === 'sell'}
                    onChange={() => setSide('sell')}
                  />
                  <span>SELL</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid cols4" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>Quantity</label>
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
              <label>Rate (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={rate}
                onChange={e => setRate(e.target.value)}
                required
              />
            </div>

            <div className="fld">
              <label>Amount (₹) [Qty × Rate]</label>
              <input type="text" readOnly value={fmtPlain(amount)} className="readonlyInput" />
            </div>

            <div className="fld">
              <label>Fees / Brokerage (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={fees}
                onChange={e => setFees(e.target.value)}
              />
            </div>
          </div>

          <div className="grid cols4" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>IGST / GST (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={igst}
                onChange={e => setIgst(e.target.value)}
              />
            </div>

            {side === 'sell' && (
              <div className="fld">
                <label>1% TDS (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={tds}
                  onChange={e => setTds(e.target.value)}
                />
              </div>
            )}

            <div className="fld">
              <label style={{ color: 'var(--green-dark)', fontWeight: 700 }}>
                Net Total Amount (₹) {side === 'buy' ? '[Amt + Fees + GST]' : '[Amt - Fees - GST - TDS]'}
              </label>
              <input
                type="text"
                readOnly
                value={fmtPlain(total)}
                className="readonlyInput"
                style={{ fontWeight: 800, color: 'var(--green-dark)', background: '#eef6ec' }}
              />
            </div>

            <div className="fld">
              <label>Invoice / Attachment</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} />
            </div>
          </div>

          {/* CHIPS */}
          <div style={{ marginTop: 14 }}>
            <div className="chipGroupLabel">Saved Scripts (click to fill):</div>
            <div className="brokerChips">
              {savedScripts.map(s => (
                <span key={s} className="brokerChip" onClick={() => setScript(s)}>
                  <span>{s}</span>
                  <span
                    className="chipX"
                    onClick={(e) => { e.stopPropagation(); handleDeleteScriptChip(s); }}
                    title="Remove script"
                  >
                    &times;
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="chipGroupLabel">Saved Brokers (click to fill):</div>
            <div className="brokerChips">
              {savedBrokers.map(b => (
                <span key={b} className="brokerChip" onClick={() => setBroker(b)}>
                  <span>{b}</span>
                  <span
                    className="chipX"
                    onClick={(e) => { e.stopPropagation(); handleDeleteBrokerChip(b); }}
                    title="Remove broker"
                  >
                    &times;
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Save Crypto Entry
            </button>
          </div>
        </form>
      </div>

      {/* SCRIPT-WISE P&L CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#1f4d1f" />
            <span>Profit / Loss — Crypto (Script-wise)</span>
          </div>
          <button
            className="btn small secondary"
            onClick={() => setSelectedNextLevelScript(unsoldScripts[0] || null)}
          >
            <Sparkles size={14} style={{ marginRight: 4 }} />
            Next Levels Targets (+12.5%)
          </button>
        </div>

        {/* Filter by broker */}
        <div style={{ marginBottom: 12 }}>
          <div className="chipGroupLabel">Filter by Broker:</div>
          <div className="brokerChips">
            <span
              className={`brokerChip ${filterBroker === '' ? 'active' : ''}`}
              onClick={() => setFilterBroker('')}
            >
              All Brokers
            </span>
            {savedBrokers.map(b => (
              <span
                key={b}
                className={`brokerChip ${filterBroker === b ? 'active' : ''}`}
                onClick={() => setFilterBroker(b)}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="tableWrap" id="cryptoPLTable">
          <table>
            <thead>
              <tr>
                <th>Script</th>
                <th>Buy Qty</th>
                <th>Sell Qty</th>
                <th>Bal Qty</th>
                <th>Total Buy Value (₹)</th>
                <th>Total Sell Value (₹)</th>
                <th>Gross P&L (₹)</th>
                <th>1% TDS (₹)</th>
                <th>30% Tax (₹)</th>
                <th>Net P&L (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(scriptPLMap).length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty">No crypto entries found.</td>
                </tr>
              ) : (
                Object.keys(scriptPLMap).sort().map(s => {
                  const d = scriptPLMap[s];
                  return (
                    <tr key={s}>
                      <td><strong>{s}</strong></td>
                      <td>{fmt(d.buyQty)}</td>
                      <td>{fmt(d.sellQty)}</td>
                      <td><strong>{fmt(d.balQty)}</strong></td>
                      <td>{fmt(d.buy)}</td>
                      <td>{fmt(d.sell)}</td>
                      <td className={d.pl >= 0 ? 'pos' : 'neg'}>{fmt(d.pl)}</td>
                      <td style={{ color: 'var(--red)' }}>{fmt(d.tds)}</td>
                      <td>{fmt(d.tax)}</td>
                      <td className={d.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
                        {fmt(d.net)}
                      </td>
                      <td>
                        {d.balQty > 0.000001 && (
                          <button
                            className="btn small secondary"
                            onClick={() => setSelectedNextLevelScript(s)}
                          >
                            Next Levels
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEXT LEVELS PANEL */}
      {selectedNextLevelScript && nextLevelDetail && (
        <div className="card nextLevelsCard" style={{ border: '2px solid var(--gold)', background: '#fafaf5' }}>
          <div className="cardTitle">
            <span>🎯 Next Level Profit Targets (+12.5%) for {selectedNextLevelScript}</span>
            <button className="btnClose" onClick={() => setSelectedNextLevelScript(null)}>✕ Close</button>
          </div>
          <div className="helpNote">
            Calculated on active unsold FIFO buy lots. Each level gives exact target sell rate for +12.5% profit gain.
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Buy Date</th>
                  <th>Unsold Qty</th>
                  <th>Buy Rate (₹)</th>
                  <th>Target Sell Rate (+12.5%) (₹)</th>
                  <th>Expected Total Sell (₹)</th>
                  <th>Expected Profit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {nextLevelDetail.levels.map((lvl, i) => (
                  <tr key={i}>
                    <td>{fmtDate(lvl.date)}</td>
                    <td><strong>{fmt(lvl.qty)}</strong></td>
                    <td>{fmt(lvl.buyRate)}</td>
                    <td style={{ color: 'var(--pos)', fontWeight: 800 }}>{fmt(lvl.targetRate)}</td>
                    <td>{fmt(lvl.targetTotal)}</td>
                    <td className="pos">+{fmt(lvl.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED CRYPTO ENTRIES LIST */}
      <div className="card">
        <div className="cardTitle">
          <span>Crypto Entries ({filteredEntries.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF('Crypto Entries', '#cryptoEntriesTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        <div className="tableWrap" id="cryptoEntriesTable">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Script</th>
                <th>Side</th>
                <th>Broker</th>
                <th>Qty</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
                <th>Fees (₹)</th>
                <th>IGST (₹)</th>
                <th>TDS (₹)</th>
                <th>Total (₹)</th>
                <th>Attachment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="13" className="empty">No entries found.</td>
                </tr>
              ) : (
                filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td><strong>{e.script}</strong></td>
                    <td>
                      <span className={`tag ${e.side}`}>
                        {e.side.toUpperCase()}
                      </span>
                    </td>
                    <td>{e.broker || '—'}</td>
                    <td>{fmt(e.qty)}</td>
                    <td>{fmt(e.rate)}</td>
                    <td>{fmt(e.amount || e.qty * e.rate)}</td>
                    <td>{fmt(e.fees || 0)}</td>
                    <td>{fmt(e.igst || 0)}</td>
                    <td>{e.side === 'sell' ? fmt(e.tds || 0) : '—'}</td>
                    <td><strong>{fmt(e.total)}</strong></td>
                    <td>
                      {e.attachment ? (
                        <button
                          className="btnGhost"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => {
                            setModalPayload(e.attachment);
                            setActiveModal('invoice');
                          }}
                        >
                          <Paperclip size={12} style={{ marginRight: 3 }} />
                          View
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
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
            <button className="closeX" onClick={() => setEditingEntry(null)}>
              <X size={20} />
            </button>
            <h3 className="modalTitle">Edit Crypto Entry</h3>
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
                  <label>Script</label>
                  <input
                    type="text"
                    value={editingEntry.script}
                    onChange={e => setEditingEntry({ ...editingEntry, script: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Broker</label>
                  <input
                    type="text"
                    value={editingEntry.broker}
                    onChange={e => setEditingEntry({ ...editingEntry, broker: e.target.value })}
                  />
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
                  <label>Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.qty}
                    onChange={e => {
                      const q = parseFloat(e.target.value) || 0;
                      const r = parseFloat(editingEntry.rate) || 0;
                      const a = q * r;
                      const tot = editingEntry.side === 'buy'
                        ? a + (editingEntry.fees || 0) + (editingEntry.igst || 0)
                        : a - (editingEntry.fees || 0) - (editingEntry.igst || 0) - (editingEntry.tds || 0);
                      setEditingEntry({ ...editingEntry, qty: q, amount: a, total: tot });
                    }}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.rate}
                    onChange={e => {
                      const r = parseFloat(e.target.value) || 0;
                      const q = parseFloat(editingEntry.qty) || 0;
                      const a = q * r;
                      const tot = editingEntry.side === 'buy'
                        ? a + (editingEntry.fees || 0) + (editingEntry.igst || 0)
                        : a - (editingEntry.fees || 0) - (editingEntry.igst || 0) - (editingEntry.tds || 0);
                      setEditingEntry({ ...editingEntry, rate: r, amount: a, total: tot });
                    }}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Fees (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.fees || 0}
                    onChange={e => setEditingEntry({ ...editingEntry, fees: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="fld">
                  <label>IGST (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.igst || 0}
                    onChange={e => setEditingEntry({ ...editingEntry, igst: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                {editingEntry.side === 'sell' && (
                  <div className="fld">
                    <label>TDS (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingEntry.tds || 0}
                      onChange={e => setEditingEntry({ ...editingEntry, tds: parseFloat(e.target.value) || 0 })}
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
