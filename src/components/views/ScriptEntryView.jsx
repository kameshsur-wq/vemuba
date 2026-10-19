import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtDate, uid } from '../../utils/formatters';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, Trash2, Edit3, Filter } from 'lucide-react';

export default function ScriptEntryView() {
  const { data, updateData, showNotification } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [script, setScript] = useState('');
  const [market, setMarket] = useState('crypto'); // 'crypto' | 'nse' | 'usStocks'
  const [open, setOpen] = useState('');
  const [high, setHigh] = useState('');
  const [low, setLow] = useState('');
  const [close, setClose] = useState('');

  // Filters
  const [filterMarket, setFilterMarket] = useState('all');
  const [filterScript, setFilterScript] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  const entries = data?.scriptEntries || [];
  const savedScripts = data?.scripts || [];

  const uniqueScripts = useMemo(() => {
    const set = new Set(entries.map(e => e.script));
    savedScripts.forEach(s => set.add(s));
    return [...set].filter(Boolean).sort();
  }, [entries, savedScripts]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchMkt = filterMarket === 'all' || (e.market || 'crypto') === filterMarket;
      const matchScript = !filterScript || e.script === filterScript;
      return matchMkt && matchScript;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [entries, filterMarket, filterScript]);

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const cleanScript = (script || '').trim().toUpperCase();
    const numOpen = parseFloat(open) || 0;
    const numHigh = parseFloat(high) || 0;
    const numLow = parseFloat(low) || 0;
    const numClose = parseFloat(close) || 0;

    if (!date || !cleanScript || numOpen <= 0 || numClose <= 0) {
      alert('Please fill Date, Script, Open, and Close.');
      return;
    }

    const newEntry = {
      id: uid('e'),
      date,
      script: cleanScript,
      market,
      open: numOpen,
      high: numHigh || Math.max(numOpen, numClose),
      low: numLow || Math.min(numOpen, numClose),
      close: numClose
    };

    updateData(prev => {
      const next = { ...prev };
      next.scriptEntries = [newEntry, ...(next.scriptEntries || [])];
      if (!next.scripts?.includes(cleanScript)) {
        next.scripts = [...(next.scripts || []), cleanScript].sort();
      }
      return next;
    });

    showNotification(`Saved OHLC entry for ${cleanScript}`);

    setOpen('');
    setHigh('');
    setLow('');
    setClose('');
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Delete this OHLC script entry?')) return;
    updateData(prev => ({
      ...prev,
      scriptEntries: (prev.scriptEntries || []).filter(e => e.id !== id)
    }));
    showNotification('Script entry deleted');
  };

  const handleUpdateEntry = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateData(prev => ({
      ...prev,
      scriptEntries: (prev.scriptEntries || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      )
    }));

    setEditingEntry(null);
    showNotification('Script entry updated');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Script', 'Market', 'Open', 'High', 'Low', 'Close'];
    const rows = filteredEntries.map(e => [
      e.date,
      e.script,
      e.market || 'crypto',
      e.open,
      e.high,
      e.low,
      e.close
    ]);
    downloadCSV('script_entries_ohlc.csv', headers, rows);
  };

  return (
    <div className="viewContainer">
      {/* ADD SCRIPT ENTRY CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add Script OHLC Entry (Daily / Historical Prices)</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Script Name / Symbol</label>
              <input
                type="text"
                list="seScriptDatalist"
                placeholder="INR-SHIB, INR-BTC, RELIANCE"
                value={script}
                onChange={e => setScript(e.target.value)}
                required
              />
              <datalist id="seScriptDatalist">
                {uniqueScripts.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Market Category</label>
              <select value={market} onChange={e => setMarket(e.target.value)}>
                <option value="crypto">Crypto</option>
                <option value="nse">NSE</option>
                <option value="usStocks">US Stocks</option>
              </select>
            </div>

            <div className="fld">
              <label>Open Price (₹ / $)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={open}
                onChange={e => setOpen(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid cols3" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>High Price</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={high}
                onChange={e => setHigh(e.target.value)}
              />
            </div>

            <div className="fld">
              <label>Low Price</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={low}
                onChange={e => setLow(e.target.value)}
              />
            </div>

            <div className="fld">
              <label>Close Price</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={close}
                onChange={e => setClose(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="chipGroupLabel">Saved Scripts:</div>
            <div className="brokerChips">
              {uniqueScripts.map(s => (
                <span key={s} className="brokerChip" onClick={() => setScript(s)}>
                  <span>{s}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Save Script OHLC Entry
            </button>
          </div>
        </form>
      </div>

      {/* SCRIPT ENTRIES TABLE */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Historical OHLC Entries ({filteredEntries.length})</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF('Script Entries OHLC', '#scriptEntriesTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        {/* Market & Script Filter Bar */}
        <div className="filterBar" style={{ margin: '10px 0 16px' }}>
          <div className="fld" style={{ width: 160 }}>
            <label>Filter Market</label>
            <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)}>
              <option value="all">All Markets</option>
              <option value="crypto">Crypto</option>
              <option value="nse">NSE</option>
              <option value="usStocks">US Stocks</option>
            </select>
          </div>

          <div className="fld" style={{ width: 220 }}>
            <label>Filter Script</label>
            <select value={filterScript} onChange={e => setFilterScript(e.target.value)}>
              <option value="">All Scripts ({uniqueScripts.length})</option>
              {uniqueScripts.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {filterScript && (
            <button className="btn small secondary" onClick={() => setFilterScript('')} style={{ alignSelf: 'flex-end', height: 35 }}>
              Clear Filter
            </button>
          )}
        </div>

        <div className="tableWrap" id="scriptEntriesTable">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Script</th>
                <th>Market</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Range (H - L)</th>
                <th>Change (C - O)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty">No OHLC script entries found.</td>
                </tr>
              ) : (
                filteredEntries.map(e => {
                  const chg = e.close - e.open;
                  const range = e.high - e.low;
                  return (
                    <tr key={e.id}>
                      <td>{fmtDate(e.date)}</td>
                      <td><strong>{e.script}</strong></td>
                      <td><span className="tag system">{e.market ? e.market.toUpperCase() : 'CRYPTO'}</span></td>
                      <td>{fmt(e.open)}</td>
                      <td>{fmt(e.high)}</td>
                      <td>{fmt(e.low)}</td>
                      <td><strong>{fmt(e.close)}</strong></td>
                      <td className="muted">{fmt(range)}</td>
                      <td className={chg >= 0 ? 'pos' : 'neg'}>
                        {chg >= 0 ? '+' : ''}{fmt(chg)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingEntry && (
        <div className="modalOverlay active">
          <div className="modalBox">
            <h3 className="modalTitle">Edit OHLC Script Entry</h3>
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
                  <label>Open Price</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.open}
                    onChange={e => setEditingEntry({ ...editingEntry, open: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="fld">
                  <label>High Price</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.high}
                    onChange={e => setEditingEntry({ ...editingEntry, high: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="fld">
                  <label>Low Price</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.low}
                    onChange={e => setEditingEntry({ ...editingEntry, low: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="fld">
                  <label>Close Price</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.close}
                    onChange={e => setEditingEntry({ ...editingEntry, close: parseFloat(e.target.value) || 0 })}
                    required
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
