import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtUSD, fmtPlain, fmtDate, uid } from '../../utils/formatters';
import { computeScriptPL } from '../../utils/plCalculations';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, TrendingUp, Sparkles, Trash2, Edit3, Paperclip, X } from 'lucide-react';

export default function UsStocksEntryView() {
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

  const savedScripts = data?.savedUsStocksScripts || [];
  const savedBrokers = data?.savedUsStocksBrokers || [];
  const entries = data?.usStocksEntries || [];

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
      market: 'usStocks',
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
      next.usStocksEntries = [newEntry, ...(next.usStocksEntries || [])];
      next.spotEntries = [newEntry, ...(next.spotEntries || [])];

      if (!next.savedUsStocksScripts?.includes(cleanScript)) {
        next.savedUsStocksScripts = [...(next.savedUsStocksScripts || []), cleanScript].sort();
      }
      if (cleanBroker) {
        if (!next.savedUsStocksBrokers?.includes(cleanBroker)) {
          next.savedUsStocksBrokers = [...(next.savedUsStocksBrokers || []), cleanBroker].sort();
        }
      }
      return next;
    });

    showNotification(`Saved US Stocks ${side.toUpperCase()} entry for ${cleanScript}`);

    setQty('');
    setRate('');
    setFees('');
    setIgst('');
    setSebi('');
    setOther('');
    setAttachment(null);
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Delete this US Stocks entry?')) return;
    updateData(prev => ({
      ...prev,
      usStocksEntries: (prev.usStocksEntries || []).filter(e => e.id !== id),
      spotEntries: (prev.spotEntries || []).filter(e => e.id !== id)
    }));
    showNotification('US Stocks entry deleted');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Script', 'Side', 'Broker', 'Qty', 'Rate ($)', 'Amount ($)', 'Fees ($)', 'Total ($)'];
    const rows = entries.map(e => [
      e.date,
      e.script,
      (e.side || 'buy').toUpperCase(),
      e.broker || '',
      e.qty,
      e.rate,
      e.amount || (e.qty * e.rate),
      e.fees || 0,
      e.total
    ]);
    downloadCSV('us_stocks_entries.csv', headers, rows);
  };

  const unsoldScripts = useMemo(() => {
    return Object.keys(scriptPLMap).filter(s => scriptPLMap[s].balQty > 0.000001).sort();
  }, [scriptPLMap]);

  return (
    <div className="viewContainer">
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add US Stocks Entry</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Script (Ticker Symbol: AAPL, MSFT, TSLA)</label>
              <input
                type="text"
                list="usScriptList"
                placeholder="AAPL, NVDA"
                value={script}
                onChange={e => setScript(e.target.value)}
                required
              />
              <datalist id="usScriptList">
                {savedScripts.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Broker / Platform</label>
              <input
                type="text"
                list="usBrokerList"
                placeholder="IndMoney, Vested, DriveWealth"
                value={broker}
                onChange={e => setBroker(e.target.value)}
              />
              <datalist id="usBrokerList">
                {savedBrokers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Side</label>
              <div className="radioRow">
                <label className={`radioBtn ${side === 'buy' ? 'active buy' : ''}`}>
                  <input
                    type="radio"
                    name="us_side"
                    value="buy"
                    checked={side === 'buy'}
                    onChange={() => setSide('buy')}
                  />
                  <span>BUY</span>
                </label>
                <label className={`radioBtn ${side === 'sell' ? 'active sell' : ''}`}>
                  <input
                    type="radio"
                    name="us_side"
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
              <label>Shares (Quantity)</label>
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
              <label>Rate ($ USD)</label>
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
              <label>Amount ($ USD)</label>
              <input type="text" readOnly value={fmtPlain(amount)} className="readonlyInput" />
            </div>

            <div className="fld">
              <label>Fees / Commission ($)</label>
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
              <label>Regulatory / Other ($)</label>
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
                Total Net Amount ($ USD)
              </label>
              <input
                type="text"
                readOnly
                value={fmtPlain(total)}
                className="readonlyInput"
                style={{ fontWeight: 800, color: 'var(--green-dark)', background: '#eef6ec' }}
              />
            </div>

            <div className="fld" style={{ gridColumn: 'span 2' }}>
              <label>Trade Confirmation / Note</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Save US Stocks Entry
            </button>
          </div>
        </form>
      </div>

      {/* P&L */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#1f4d1f" />
            <span>Profit / Loss — US Stocks (Script-wise in USD)</span>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Buy Qty</th>
                <th>Sell Qty</th>
                <th>Bal Qty</th>
                <th>Total Buy Value ($)</th>
                <th>Total Sell Value ($)</th>
                <th>Gross P&L ($)</th>
                <th>Net P&L ($)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(scriptPLMap).length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty">No US Stocks entries yet.</td>
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
                      <td>{fmtUSD(d.buy)}</td>
                      <td>{fmtUSD(d.sell)}</td>
                      <td className={d.pl >= 0 ? 'pos' : 'neg'}>{fmtUSD(d.pl)}</td>
                      <td className={d.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
                        {fmtUSD(d.net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED ENTRIES TABLE */}
      <div className="card">
        <div className="cardTitle">
          <span>US Stocks Entries ({filteredEntries.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF('US Stocks Entries', '#usStocksTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        <div className="tableWrap" id="usStocksTable">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Side</th>
                <th>Broker</th>
                <th>Shares</th>
                <th>Rate ($)</th>
                <th>Amount ($)</th>
                <th>Fees ($)</th>
                <th>Total ($)</th>
                <th>Attachment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty">No entries found.</td>
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
                    <td>{fmtUSD(e.rate)}</td>
                    <td>{fmtUSD(e.amount || e.qty * e.rate)}</td>
                    <td>{fmtUSD(e.fees || 0)}</td>
                    <td><strong>{fmtUSD(e.total)}</strong></td>
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
