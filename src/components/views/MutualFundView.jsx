import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtPlain, fmtDate, uid } from '../../utils/formatters';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, Trash2, Edit3, Settings } from 'lucide-react';

export default function MutualFundView() {
  const { data, updateData, showNotification } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fundName, setFundName] = useState('');
  const [broker, setBroker] = useState('');
  const [period, setPeriod] = useState('Monthly'); // Daily | Monthly | Lumpsum
  const [units, setUnits] = useState('');
  const [nav, setNav] = useState('');
  const [folio, setFolio] = useState('');

  const [editingEntry, setEditingEntry] = useState(null);

  const amount = useMemo(() => {
    const u = parseFloat(units) || 0;
    const n = parseFloat(nav) || 0;
    return Math.round(u * n * 1e8) / 1e8;
  }, [units, nav]);

  const entries = data?.mutualFund || [];
  const savedFunds = data?.mfFunds || [];
  const savedBrokers = data?.mfBrokers || [];
  const savedFolios = data?.mfFolios || [];

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const cleanFund = (fundName || '').trim();
    const cleanBroker = (broker || '').trim();
    const cleanFolio = (folio || '').trim();
    const numUnits = parseFloat(units) || 0;
    const numNav = parseFloat(nav) || 0;

    if (!date || !cleanFund || numUnits <= 0 || numNav <= 0) {
      alert('Please fill Date, Fund Name, Units (>0) and NAV (>0).');
      return;
    }

    const newEntry = {
      id: uid('mf'),
      date,
      fundName: cleanFund,
      broker: cleanBroker,
      period,
      units: numUnits,
      nav: numNav,
      amount,
      folio: cleanFolio
    };

    updateData(prev => {
      const next = { ...prev };
      next.mutualFund = [newEntry, ...(next.mutualFund || [])];

      if (cleanFund && !next.mfFunds?.includes(cleanFund)) {
        next.mfFunds = [...(next.mfFunds || []), cleanFund].sort();
      }
      if (cleanBroker && !next.mfBrokers?.includes(cleanBroker)) {
        next.mfBrokers = [...(next.mfBrokers || []), cleanBroker].sort();
      }
      if (cleanFolio && !next.mfFolios?.includes(cleanFolio)) {
        next.mfFolios = [...(next.mfFolios || []), cleanFolio].sort();
      }
      return next;
    });

    showNotification(`Saved Mutual Fund entry for ${cleanFund}`);

    setUnits('');
    setNav('');
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Delete this Mutual Fund entry?')) return;
    updateData(prev => ({
      ...prev,
      mutualFund: (prev.mutualFund || []).filter(e => e.id !== id)
    }));
    showNotification('Mutual Fund entry deleted');
  };

  const handleUpdateEntry = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateData(prev => ({
      ...prev,
      mutualFund: (prev.mutualFund || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      )
    }));

    setEditingEntry(null);
    showNotification('Mutual Fund entry updated');
  };

  const deleteSavedItem = (type, value) => {
    updateData(prev => {
      const next = { ...prev };
      if (type === 'fund') next.mfFunds = (next.mfFunds || []).filter(f => f !== value);
      if (type === 'broker') next.mfBrokers = (next.mfBrokers || []).filter(b => b !== value);
      if (type === 'folio') next.mfFolios = (next.mfFolios || []).filter(fl => fl !== value);
      return next;
    });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Fund Name', 'Broker / AMC', 'Period', 'Units', 'NAV (₹)', 'Total Amount (₹)', 'Folio No.'];
    const rows = entries.map(e => [
      e.date,
      e.fundName,
      e.broker || '',
      e.period || 'Lumpsum',
      e.units,
      e.nav,
      e.amount,
      e.folio || ''
    ]);
    downloadCSV('mutual_fund_entries.csv', headers, rows);
  };

  return (
    <div className="viewContainer">
      {/* ADD MUTUAL FUND CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add Mutual Fund Entry</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Fund Name</label>
              <input
                type="text"
                list="mfFundList"
                placeholder="e.g. Parag Parikh Flexi Cap Fund"
                value={fundName}
                onChange={e => setFundName(e.target.value)}
                required
              />
              <datalist id="mfFundList">
                {savedFunds.map(f => <option key={f} value={f} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Broker / AMC</label>
              <input
                type="text"
                list="mfBrokerList"
                placeholder="e.g. Zerodha, Groww, MF Utility"
                value={broker}
                onChange={e => setBroker(e.target.value)}
              />
              <datalist id="mfBrokerList">
                {savedBrokers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Investment Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="Daily">Daily SIP</option>
                <option value="Monthly">Monthly SIP</option>
                <option value="Lumpsum">Lumpsum (One-Time)</option>
              </select>
            </div>
          </div>

          <div className="grid cols4" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>Units Purchased</label>
              <input
                type="number"
                step="any"
                placeholder="0.000"
                value={units}
                onChange={e => setUnits(e.target.value)}
                required
              />
            </div>

            <div className="fld">
              <label>NAV (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.0000"
                value={nav}
                onChange={e => setNav(e.target.value)}
                required
              />
            </div>

            <div className="fld">
              <label style={{ color: 'var(--green-dark)', fontWeight: 700 }}>
                Total Amount (₹) [Units × NAV]
              </label>
              <input
                type="text"
                readOnly
                value={fmtPlain(amount)}
                className="readonlyInput"
                style={{ fontWeight: 800, color: 'var(--green-dark)', background: '#eef6ec' }}
              />
            </div>

            <div className="fld">
              <label>Folio Number</label>
              <input
                type="text"
                list="mfFolioList"
                placeholder="e.g. 10293847/56"
                value={folio}
                onChange={e => setFolio(e.target.value)}
              />
              <datalist id="mfFolioList">
                {savedFolios.map(fl => <option key={fl} value={fl} />)}
              </datalist>
            </div>
          </div>

          {/* Saved Chips */}
          <div style={{ marginTop: 14 }}>
            <div className="chipGroupLabel">Saved Funds (click to select):</div>
            <div className="brokerChips">
              {savedFunds.map(f => (
                <span key={f} className="brokerChip" onClick={() => setFundName(f)}>
                  <span>{f}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="chipGroupLabel">Saved Brokers / AMCs:</div>
            <div className="brokerChips">
              {savedBrokers.map(b => (
                <span key={b} className="brokerChip" onClick={() => setBroker(b)}>
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="chipGroupLabel">Saved Folio Numbers:</div>
            <div className="brokerChips">
              {savedFolios.map(fl => (
                <span key={fl} className="brokerChip" onClick={() => setFolio(fl)}>
                  <span>{fl}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Save Mutual Fund Entry
            </button>
          </div>
        </form>
      </div>

      {/* MANAGE SAVED ITEMS CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} color="#1f4d1f" />
            <span>Manage Saved Fund Names, Folios &amp; Brokers</span>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Fund Names:</div>
          <div className="brokerChips">
            {savedFunds.map(f => (
              <span key={f} className="brokerChip">
                <span>{f}</span>
                <span className="chipX" onClick={() => deleteSavedItem('fund', f)}>&times;</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Folio Numbers:</div>
          <div className="brokerChips">
            {savedFolios.map(fl => (
              <span key={fl} className="brokerChip">
                <span>{fl}</span>
                <span className="chipX" onClick={() => deleteSavedItem('folio', fl)}>&times;</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Brokers / AMCs:</div>
          <div className="brokerChips">
            {savedBrokers.map(b => (
              <span key={b} className="brokerChip">
                <span>{b}</span>
                <span className="chipX" onClick={() => deleteSavedItem('broker', b)}>&times;</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ENTRIES LIST CARD */}
      <div className="card">
        <div className="cardTitle">
          <span>Mutual Fund Entries ({entries.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF('Mutual Fund Entries', '#mfTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        <div className="tableWrap" id="mfTable">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Fund Name</th>
                <th>Broker / AMC</th>
                <th>Period</th>
                <th>Units</th>
                <th>NAV (₹)</th>
                <th>Total Amount (₹)</th>
                <th>Folio No.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty">No Mutual Fund entries yet.</td>
                </tr>
              ) : (
                entries.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td><strong>{e.fundName}</strong></td>
                    <td>{e.broker || '—'}</td>
                    <td><span className="tag system">{e.period || 'Lumpsum'}</span></td>
                    <td>{fmt(e.units)}</td>
                    <td>{fmt(e.nav)}</td>
                    <td><strong>{fmt(e.amount)}</strong></td>
                    <td>{e.folio || '—'}</td>
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
            <h3 className="modalTitle">Edit Mutual Fund Entry</h3>
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
                  <label>Fund Name</label>
                  <input
                    type="text"
                    value={editingEntry.fundName}
                    onChange={e => setEditingEntry({ ...editingEntry, fundName: e.target.value })}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Broker / AMC</label>
                  <input
                    type="text"
                    value={editingEntry.broker}
                    onChange={e => setEditingEntry({ ...editingEntry, broker: e.target.value })}
                  />
                </div>
                <div className="fld">
                  <label>Period</label>
                  <select
                    value={editingEntry.period || 'Monthly'}
                    onChange={e => setEditingEntry({ ...editingEntry, period: e.target.value })}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Lumpsum">Lumpsum</option>
                  </select>
                </div>
                <div className="fld">
                  <label>Units</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.units}
                    onChange={e => {
                      const u = parseFloat(e.target.value) || 0;
                      const n = parseFloat(editingEntry.nav) || 0;
                      setEditingEntry({ ...editingEntry, units: u, amount: u * n });
                    }}
                    required
                  />
                </div>
                <div className="fld">
                  <label>NAV (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.nav}
                    onChange={e => {
                      const n = parseFloat(e.target.value) || 0;
                      const u = parseFloat(editingEntry.units) || 0;
                      setEditingEntry({ ...editingEntry, nav: n, amount: u * n });
                    }}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Total Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.amount}
                    onChange={e => setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="fld">
                  <label>Folio No.</label>
                  <input
                    type="text"
                    value={editingEntry.folio || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, folio: e.target.value })}
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
