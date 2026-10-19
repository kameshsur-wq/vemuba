import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtDate, uid } from '../../utils/formatters';
import { computeLedgerPLSummary } from '../../utils/plCalculations';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { PlusCircle, Download, Printer, Wallet, ArrowUpRight, ArrowDownLeft, Trash2, Edit3 } from 'lucide-react';

const MARKETS = [
  { id: 'crypto', label: 'Crypto', key: 'ledgerCrypto', banksKey: 'ledgerBanksCrypto' },
  { id: 'nse', label: 'NSE', key: 'ledgerNse', banksKey: 'ledgerBanksNse' },
  { id: 'mutualFund', label: 'Mutual Fund', key: 'ledgerMF', banksKey: 'ledgerBanksMF' },
  { id: 'metals', label: 'Metals', key: 'ledgerMetals', banksKey: 'ledgerBanksMetals' },
  { id: 'usStocks', label: 'US Stocks', key: 'ledgerUsStocks', banksKey: 'ledgerBanksUsStocks' }
];

export default function LedgerView() {
  const { data, updateData, showNotification } = useApp();

  const [selectedMarket, setSelectedMarket] = useState('crypto');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [broker, setBroker] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState('invest'); // 'invest' | 'withdraw'
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Bank Transfer');
  const [note, setNote] = useState('');

  // Filters
  const [filterBroker, setFilterBroker] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  const activeMarketConfig = useMemo(() => {
    return MARKETS.find(m => m.id === selectedMarket) || MARKETS[0];
  }, [selectedMarket]);

  const rawEntries = useMemo(() => {
    return data?.[activeMarketConfig.key] || [];
  }, [data, activeMarketConfig]);

  const savedBrokers = useMemo(() => {
    if (selectedMarket === 'crypto') return data?.savedCryptoBrokers || data?.brokers || [];
    if (selectedMarket === 'nse') return data?.savedNseBrokers || [];
    if (selectedMarket === 'mutualFund') return data?.mfBrokers || [];
    if (selectedMarket === 'metals') return data?.metalBrokers || [];
    if (selectedMarket === 'usStocks') return data?.savedUsStocksBrokers || [];
    return [];
  }, [data, selectedMarket]);

  const savedBanks = useMemo(() => {
    return data?.[activeMarketConfig.banksKey] || data?.ledgerBanks || ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'];
  }, [data, activeMarketConfig]);

  // Overall KPI summary for this market
  const kpis = useMemo(() => {
    return computeLedgerPLSummary(data || {}, selectedMarket);
  }, [data, selectedMarket]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return rawEntries.filter(e => {
      const matchBroker = !filterBroker || (e.broker || '').toLowerCase() === filterBroker.toLowerCase();
      const matchBank = !filterBank || (e.bank || '').toLowerCase() === filterBank.toLowerCase();
      return matchBroker && matchBank;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [rawEntries, filterBroker, filterBank]);

  // Running balance calculation
  const rowsWithBalance = useMemo(() => {
    const asc = [...rawEntries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    let bal = 0;
    const balMap = {};
    asc.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'invest') bal += amt;
      else bal -= amt;
      balMap[e.id] = bal;
    });

    return filteredEntries.map(e => ({
      ...e,
      runningBalance: balMap[e.id] ?? 0
    }));
  }, [rawEntries, filteredEntries]);

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const cleanBroker = (broker || '').trim();
    const cleanBank = (bank || '').trim();
    const numAmount = parseFloat(amount) || 0;

    if (!date || numAmount <= 0) {
      alert('Please fill Date and valid Amount (>0).');
      return;
    }

    const newEntry = {
      id: uid('ld'),
      date,
      broker: cleanBroker,
      bank: cleanBank,
      type,
      amount: numAmount,
      mode,
      note: (note || '').trim()
    };

    updateData(prev => {
      const next = { ...prev };
      const currentList = next[activeMarketConfig.key] || [];
      next[activeMarketConfig.key] = [newEntry, ...currentList];

      // Also maintain global ledger for backwards compatibility
      next.ledger = [newEntry, ...(next.ledger || [])];

      if (cleanBank && !next[activeMarketConfig.banksKey]?.includes(cleanBank)) {
        next[activeMarketConfig.banksKey] = [...(next[activeMarketConfig.banksKey] || []), cleanBank].sort();
      }

      return next;
    });

    showNotification(`Added ${type.toUpperCase()} of ₹${fmt(numAmount)} to ${activeMarketConfig.label} Ledger`);

    setAmount('');
    setNote('');
  };

  const handleDeleteEntry = (id) => {
    if (!window.confirm('Delete this ledger entry?')) return;
    updateData(prev => ({
      ...prev,
      [activeMarketConfig.key]: (prev[activeMarketConfig.key] || []).filter(e => e.id !== id),
      ledger: (prev.ledger || []).filter(e => e.id !== id)
    }));
    showNotification('Ledger entry deleted');
  };

  const handleUpdateEntry = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    updateData(prev => ({
      ...prev,
      [activeMarketConfig.key]: (prev[activeMarketConfig.key] || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      ),
      ledger: (prev.ledger || []).map(item =>
        item.id === editingEntry.id ? { ...editingEntry } : item
      )
    }));

    setEditingEntry(null);
    showNotification('Ledger entry updated');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Broker', 'Bank', 'Type', 'Amount (₹)', 'Mode', 'Note'];
    const rows = filteredEntries.map(e => [
      e.date,
      e.broker || '',
      e.bank || '',
      e.type ? e.type.toUpperCase() : 'INVEST',
      e.amount,
      e.mode || '',
      e.note || ''
    ]);
    downloadCSV(`investment_ledger_${selectedMarket}.csv`, headers, rows);
  };

  return (
    <div className="viewContainer">
      {/* MARKET SELECTOR TABS */}
      <div className="marketTypeBox">
        {MARKETS.map(m => (
          <button
            key={m.id}
            className={`marketTypeBtn ${selectedMarket === m.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedMarket(m.id);
              setFilterBroker('');
              setFilterBank('');
            }}
          >
            <span className="mtIcon">
              {m.id === 'crypto' ? '₿' : m.id === 'nse' ? '📈' : m.id === 'mutualFund' ? '📊' : m.id === 'metals' ? '🥇' : '🇺🇸'}
            </span>
            <span className="mtLabel">{m.label}</span>
          </button>
        ))}
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Total Invested (Deposits)</div>
          <div className="val">{fmt(kpis.totalInvest)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Current Portfolio Value</div>
          <div className="val" style={{ color: kpis.balance >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
            {fmt(kpis.balance)}
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">Net Profit / Loss</div>
          <div className="val" style={{ color: kpis.netPL >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
            {kpis.netPL >= 0 ? '+' : ''}{fmt(kpis.netPL)} ({kpis.plPct.toFixed(2)}%)
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">Total Withdrawals (Debits)</div>
          <div className="val" style={{ color: 'var(--muted)' }}>
            {fmt(kpis.totalWithdraw)}
          </div>
        </div>
      </div>

      {/* ADD LEDGER ENTRY FORM */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} color="#1f4d1f" />
            <span>Add Ledger Entry — {activeMarketConfig.label}</span>
          </div>
        </div>

        <form onSubmit={handleSaveEntry}>
          <div className="grid cols4">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="fld">
              <label>Broker / Exchange / AMC</label>
              <input
                type="text"
                list="ldBrokerDatalist"
                placeholder="Coinswitch, Zerodha, etc."
                value={broker}
                onChange={e => setBroker(e.target.value)}
              />
              <datalist id="ldBrokerDatalist">
                {savedBrokers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Bank Account</label>
              <input
                type="text"
                list="ldBankDatalist"
                placeholder="State Bank of India, HDFC"
                value={bank}
                onChange={e => setBank(e.target.value)}
              />
              <datalist id="ldBankDatalist">
                {savedBanks.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="fld">
              <label>Transaction Type</label>
              <div className="radioRow">
                <label className={`radioBtn ${type === 'invest' ? 'active buy' : ''}`}>
                  <input
                    type="radio"
                    name="ld_type"
                    value="invest"
                    checked={type === 'invest'}
                    onChange={() => setType('invest')}
                  />
                  <span>INVEST (Credit)</span>
                </label>
                <label className={`radioBtn ${type === 'withdraw' ? 'active sell' : ''}`}>
                  <input
                    type="radio"
                    name="ld_type"
                    value="withdraw"
                    checked={type === 'withdraw'}
                    onChange={() => setType('withdraw')}
                  />
                  <span>WITHDRAW (Debit)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid cols3" style={{ marginTop: 12 }}>
            <div className="fld">
              <label>Amount (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="fld">
              <label>Payment Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="UPI">UPI</option>
                <option value="IMPS">IMPS</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="fld">
              <label>Notes / Reference (optional)</label>
              <input
                type="text"
                placeholder="Remarks, UTR, or reference"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Chips */}
          <div style={{ marginTop: 14 }}>
            <div className="chipGroupLabel">Saved Brokers:</div>
            <div className="brokerChips">
              {savedBrokers.map(b => (
                <span key={b} className="brokerChip" onClick={() => setBroker(b)}>
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="chipGroupLabel">Saved Banks:</div>
            <div className="brokerChips">
              {savedBanks.map(b => (
                <span key={b} className="brokerChip" onClick={() => setBank(b)}>
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              Record Ledger Entry
            </button>
          </div>
        </form>
      </div>

      {/* ENTRIES LIST */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{activeMarketConfig.label} Ledger Entries ({rowsWithBalance.length})</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF(`${activeMarketConfig.label} Investment Ledger`, '#ledgerTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filterBar" style={{ margin: '8px 0 14px' }}>
          <div className="fld" style={{ width: 180 }}>
            <label>Filter by Broker</label>
            <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)}>
              <option value="">All Brokers</option>
              {savedBrokers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="fld" style={{ width: 180 }}>
            <label>Filter by Bank</label>
            <select value={filterBank} onChange={e => setFilterBank(e.target.value)}>
              <option value="">All Banks</option>
              {savedBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {(filterBroker || filterBank) && (
            <button
              className="btn small secondary"
              onClick={() => { setFilterBroker(''); setFilterBank(''); }}
              style={{ alignSelf: 'flex-end', height: 35 }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="tableWrap" id="ledgerTable">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Broker / Exchange</th>
                <th>Bank Account</th>
                <th>Type</th>
                <th>Amount (₹)</th>
                <th>Running Capital Balance (₹)</th>
                <th>Payment Mode</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty">No ledger transactions found for {activeMarketConfig.label}.</td>
                </tr>
              ) : (
                rowsWithBalance.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td><strong>{e.broker || '—'}</strong></td>
                    <td>{e.bank || '—'}</td>
                    <td>
                      <span className={`tag ${e.type === 'invest' ? 'buy' : 'sell'}`}>
                        {e.type === 'invest' ? 'INVEST' : 'WITHDRAW'}
                      </span>
                    </td>
                    <td>
                      <span className={e.type === 'invest' ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
                        {e.type === 'invest' ? '+' : '-'}{fmt(e.amount)}
                      </span>
                    </td>
                    <td><strong>{fmt(e.runningBalance)}</strong></td>
                    <td><span className="tag system">{e.mode || 'Bank'}</span></td>
                    <td className="muted">{e.note || '—'}</td>
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
            <h3 className="modalTitle">Edit Ledger Entry</h3>
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
                  <label>Broker</label>
                  <input
                    type="text"
                    value={editingEntry.broker || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, broker: e.target.value })}
                  />
                </div>
                <div className="fld">
                  <label>Bank</label>
                  <input
                    type="text"
                    value={editingEntry.bank || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, bank: e.target.value })}
                  />
                </div>
                <div className="fld">
                  <label>Type</label>
                  <select
                    value={editingEntry.type || 'invest'}
                    onChange={e => setEditingEntry({ ...editingEntry, type: e.target.value })}
                  >
                    <option value="invest">INVEST</option>
                    <option value="withdraw">WITHDRAW</option>
                  </select>
                </div>
                <div className="fld">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.amount}
                    onChange={e => setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="fld">
                  <label>Mode</label>
                  <input
                    type="text"
                    value={editingEntry.mode || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, mode: e.target.value })}
                  />
                </div>
              </div>
              <div className="fld" style={{ marginTop: 10 }}>
                <label>Note</label>
                <input
                  type="text"
                  value={editingEntry.note || ''}
                  onChange={e => setEditingEntry({ ...editingEntry, note: e.target.value })}
                />
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
