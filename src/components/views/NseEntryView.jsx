import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtPlain, fmtDate, uid } from '../../utils/formatters';
import { computeScriptPL } from '../../utils/plCalculations';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, TrendingUp, Sparkles, Trash2, Edit3, Paperclip, X } from 'lucide-react';

export default function NseEntryView() {
  const { data, updateData, setActiveModal, setModalPayload, showNotification } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [script, setScript] = useState('');
  const [broker, setBroker] = useState('');
  const [side, setSide] = useState('buy');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [fees, setFees] = useState('');
  const [igst, setIgst] = useState('');
  const [sebi, setSebi] = useState('');
  const [other, setOther] = useState('');
  const [attachment, setAttachment] = useState(null);

  // Filters
  const [filterBroker, setFilterBroker] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedNextLevelScript, setSelectedNextLevelScript] = useState(null);

  const amount = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return Math.round(q * r * 1e8) / 1e8;
  }, [qty, rate]);

  const total = useMemo(() => {
    const f = parseFloat(fees) || 0;
    const g = parseFloat(igst) || 0;
    const sb = parseFloat(sebi) || 0;
    const ot = parseFloat(other) || 0;
    if (side === 'buy') {
      return Math.round((amount + f + g + sb + ot) * 1e8) / 1e8;
    } else {
      return Math.round((amount - f - g - sb - ot) * 1e8) / 1e8;
    }
  }, [amount, fees, igst, sebi, other, side]);

  const savedScripts = data?.savedNseScripts || [];
  const savedBrokers = data?.savedNseBrokers || [];
  const entries = data?.nseEntries || [];

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
      market: 'nse',
      qty: numQty,
      rate: numRate,
      amount,
      fees: parseFloat(fees) || 0,
      igst: parseFloat(igst) || 0,
      sebi: parseFloat(sebi) || 0,
      other: parseFloat(other) || 0,
      total,
      attachment
    };

    updateData(prev => {
      const next = { ...prev };
      next.nseEntries = [newEntry, ...(next.nseEntries || [])];
      next.spotEntries = [newEntry, ...(next.spotEntries || [])];

      if (!next.savedNseScripts?.includes(cleanScript)) {
        next.savedNseScripts = [...(next.savedNseScripts || []), cleanScript].sort();
      }
      if (!next.scripts?.includes(cleanScript)) {
        next.scripts = [...(next.scripts || []), cleanScript].sort();
      }
      if (cleanBroker) {
        if (!next.savedNseBrokers?.includes(cleanBroker)) {
          next.savedNseBrokers = [...(next.savedNseBrokers || []), cleanBroker].sort();
        }
        if (!next.brokers?.includes(cleanBroker)) {
          next.brokers = [...(next.brokers || []), cleanBroker].sort();
        }
      }
      return next;
    });

    showNotification(`Saved NSE ${side.toUpperCase()} entry for ${cleanScript}`);

    setQty('');
    setRate('');
    setFees('');
    setIgst('');
    setSebi('');
    setOther('');
    setAttachment(null);
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Delete this NSE entry?')) return;
    updateData(prev => ({
      ...prev,
      nseEntries: (prev.nseEntries || []).filter(e => e.id !== id),
      spotEntries: (prev.spotEntries || []).filter(e => e.id !== id)
    }));
    showNotification('NSE entry deleted');
  };

  const handleUpdateEntry = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateData(prev => ({
      ...prev,
      nseEntries: (prev.nseEntries || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      ),
      spotEntries: (prev.spotEntries || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      )
    }));

    setEditingEntry(null);
    showNotification('NSE entry updated');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Script', 'Side', 'Broker', 'Qty', 'Rate', 'Amount', 'Fees', 'IGST', 'SEBI', 'Other', 'Total'];
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
      e.sebi || 0,
      e.other || 0,
      e.total
    ]);
    downloadCSV('nse_entries.csv', headers, rows);
  };

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
        const targetRate = b.rate * 1.05; // +5% for NSE
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
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add NSE Stock Entry</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Script (Stock Name / Symbol)</label>
              <input
                type="text"
                list="nseScriptList"
                placeholder="RELIANCE, TCS, INFY"
                value={script}
                onChange={e => setScript(e.target.value)}
                required
              />
              <datalist id="nseScriptList">
                {savedScripts.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Broker / Demat</label>
              <input
                type="text"
                list="nseBrokerList"
                placeholder="Zerodha, Groww, AngelOne"
                value={broker}
                onChange={e => setBroker(e.target.value)}
              />
              <datalist id="nseBrokerList">
                {savedBrokers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Side</label>
              <div className="radioRow">
                <label className={`radioBtn ${side === 'buy' ? 'active buy' : ''}`}>
                  <input
                    type="radio"
                    name="nse_side"
                    value="buy"
                    checked={side === 'buy'}
                    onChange={() => setSide('buy')}
                  />
                  <span>BUY</span>
                </label>
                <label className={`radioBtn ${side === 'sell' ? 'active sell' : ''}`}>
                  <input
                    type="radio"
                    name="nse_side"
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
              <label>Brokerage / Fees (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={fees}
                onChange={e => setFees(e.target.value)}
              />
            </div>
          </div>

          <div className="grid cols5" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>IGST (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={igst}
                onChange={e => setIgst(e.target.value)}
              />
            </div>

            <div className="fld">
              <label>SEBI Charges (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={sebi}
                onChange={e => setSebi(e.target.value)}
              />
            </div>

            <div className="fld">
              <label>Stamp / Other (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={other}
                onChange={e => setOther(e.target.value)}
              />
            </div>

            <div className="fld">
              <label style={{ color: 'var(--green-dark)', fontWeight: 700 }}>
                Net Total (₹)
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
              <label>Invoice / Contract Note</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="chipGroupLabel">Saved NSE Scripts:</div>
            <div className="brokerChips">
              {savedScripts.map(s => (
                <span key={s} className="brokerChip" onClick={() => setScript(s)}>
                  <span>{s}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Save NSE Entry
            </button>
          </div>
        </form>
      </div>

      {/* P&L */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#1f4d1f" />
            <span>Profit / Loss — NSE (Script-wise)</span>
          </div>
          <button
            className="btn small secondary"
            onClick={() => setSelectedNextLevelScript(unsoldScripts[0] || null)}
          >
            <Sparkles size={14} style={{ marginRight: 4 }} />
            Next Levels (+5%)
          </button>
        </div>

        <div className="tableWrap">
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
                <th>Tax (12.5%) (₹)</th>
                <th>Net P&L (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(scriptPLMap).length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty">No NSE entries yet.</td>
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
            <span>🎯 Next Level Profit Targets (+5%) for {selectedNextLevelScript}</span>
            <button className="btnClose" onClick={() => setSelectedNextLevelScript(null)}>✕ Close</button>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Buy Date</th>
                  <th>Unsold Qty</th>
                  <th>Buy Rate (₹)</th>
                  <th>Target Sell Rate (+5%) (₹)</th>
                  <th>Expected Total (₹)</th>
                  <th>Profit (₹)</th>
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

      {/* DETAILED ENTRIES TABLE */}
      <div className="card">
        <div className="cardTitle">
          <span>NSE Entries ({filteredEntries.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF('NSE Entries', '#nseEntriesTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        <div className="tableWrap" id="nseEntriesTable">
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
                <th>Brokerage</th>
                <th>IGST</th>
                <th>SEBI</th>
                <th>Other</th>
                <th>Total (₹)</th>
                <th>Attachment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="14" className="empty">No NSE entries yet.</td>
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
                    <td>{fmt(e.sebi || 0)}</td>
                    <td>{fmt(e.other || 0)}</td>
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
    </div>
  );
}
