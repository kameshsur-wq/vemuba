import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtDate } from '../../utils/formatters';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { BarChart3, Download, Printer, PieChart, Calendar, Filter } from 'lucide-react';

const DONUT_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#3b82f6', '#14b8a6'
];

export default function ReportsView() {
  const { data } = useApp();

  const now = new Date();
  const defaultFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const [reportType, setReportType] = useState('fy'); // 'fy' | 'custom' | 'month'
  const [selectedFy, setSelectedFy] = useState(defaultFyStartYear);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedMarket, setSelectedMarket] = useState(''); // '' means All
  const [selectedScript, setSelectedScript] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('');

  // Results state
  const [reportRan, setReportRan] = useState(false);

  // Available FY options
  const fyOptions = useMemo(() => {
    const list = [];
    for (let y = defaultFyStartYear + 1; y >= defaultFyStartYear - 6; y--) {
      list.push({ year: y, label: `FY ${y}-${y + 1}` });
    }
    return list;
  }, [defaultFyStartYear]);

  // Compute active date range
  const dateRange = useMemo(() => {
    if (reportType === 'custom') {
      return { from: customFrom, to: customTo };
    }
    if (reportType === 'month') {
      if (!selectedMonth) return { from: '', to: '' };
      const [y, mo] = selectedMonth.split('-').map(Number);
      const from = `${y}-${String(mo).padStart(2, '0')}-01`;
      const lastDay = new Date(y, mo, 0).getDate();
      const to = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    // 'fy'
    return {
      from: `${selectedFy}-04-01`,
      to: `${selectedFy + 1}-03-31`
    };
  }, [reportType, selectedFy, customFrom, customTo, selectedMonth]);

  // Gather all transactions across markets
  const allTransactions = useMemo(() => {
    if (!data) return [];
    const list = [];

    // Crypto
    (data.cryptoEntries || data.spotEntries || []).forEach(e => {
      list.push({ ...e, market: 'crypto' });
    });
    // NSE
    (data.nseEntries || []).forEach(e => {
      list.push({ ...e, market: 'nse' });
    });
    // US Stocks
    (data.usStocksEntries || []).forEach(e => {
      list.push({ ...e, market: 'usStocks' });
    });
    // Metals
    (data.metals || []).forEach(e => {
      list.push({
        ...e,
        market: 'metals',
        script: e.metal || 'Gold'
      });
    });
    // Mutual Funds
    (data.mutualFund || []).forEach(e => {
      list.push({
        ...e,
        market: 'mutualFund',
        script: e.fundName,
        side: 'buy',
        total: e.amount
      });
    });

    return list;
  }, [data]);

  // Unique scripts & brokers for filter dropdowns
  const availableScripts = useMemo(() => {
    const s = new Set();
    allTransactions.forEach(t => { if (t.script) s.add(t.script); });
    return [...s].sort();
  }, [allTransactions]);

  const availableBrokers = useMemo(() => {
    const b = new Set();
    allTransactions.forEach(t => { if (t.broker) b.add(t.broker); });
    return [...b].sort();
  }, [allTransactions]);

  // Filtered transactions for report
  const reportTransactions = useMemo(() => {
    if (!reportRan) return [];
    return allTransactions.filter(t => {
      if (!t.date) return false;
      if (dateRange.from && t.date < dateRange.from) return false;
      if (dateRange.to && t.date > dateRange.to) return false;
      if (selectedMarket && (t.market || '').toLowerCase() !== selectedMarket.toLowerCase()) return false;
      if (selectedScript && t.script !== selectedScript) return false;
      if (selectedBroker && (t.broker || '').toLowerCase() !== selectedBroker.toLowerCase()) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [allTransactions, dateRange, selectedMarket, selectedScript, selectedBroker, reportRan]);

  // Aggregated Report Metrics
  const reportMetrics = useMemo(() => {
    let buyTotal = 0;
    let sellTotal = 0;
    let tdsTotal = 0;

    const scriptMap = {};
    const brokerMap = {};

    reportTransactions.forEach(t => {
      const tot = Number(t.total || t.amount) || 0;
      const tds = Number(t.tds) || 0;
      const isBuy = t.side === 'buy';

      if (isBuy) {
        buyTotal += tot;
      } else {
        sellTotal += tot;
        tdsTotal += tds;
      }

      // Script aggregation
      const sKey = t.script || 'Unknown';
      if (!scriptMap[sKey]) {
        scriptMap[sKey] = {
          script: sKey,
          market: t.market,
          buy: 0,
          sell: 0,
          buyQty: 0,
          sellQty: 0,
          tds: 0,
          count: 0
        };
      }
      if (isBuy) {
        scriptMap[sKey].buy += tot;
        scriptMap[sKey].buyQty += Number(t.qty || t.units) || 0;
      } else {
        scriptMap[sKey].sell += tot;
        scriptMap[sKey].sellQty += Number(t.qty || t.units) || 0;
        scriptMap[sKey].tds += tds;
      }
      scriptMap[sKey].count++;

      // Broker aggregation
      const bKey = t.broker || 'Direct / Unassigned';
      if (!brokerMap[bKey]) {
        brokerMap[bKey] = { broker: bKey, buy: 0, sell: 0, tds: 0, count: 0 };
      }
      if (isBuy) brokerMap[bKey].buy += tot;
      else {
        brokerMap[bKey].sell += tot;
        brokerMap[bKey].tds += tds;
      }
      brokerMap[bKey].count++;
    });

    const grossPL = sellTotal - buyTotal;
    const estTax = grossPL > 0 ? (selectedMarket === 'nse' ? grossPL * 0.125 : grossPL * 0.30) : 0;
    const netPL = grossPL - estTax;

    return {
      turnover: buyTotal + sellTotal,
      buyTotal,
      sellTotal,
      grossPL,
      tdsTotal,
      estTax,
      netPL,
      count: reportTransactions.length,
      scriptSummary: Object.values(scriptMap).map(s => {
        const pl = s.sell - s.buy;
        const taxRate = s.market === 'nse' ? 0.125 : 0.30;
        const tax = pl > 0 ? pl * taxRate : 0;
        return { ...s, pl, tax, net: pl - tax };
      }).sort((a, b) => b.sell + b.buy - (a.sell + a.buy)),
      brokerSummary: Object.values(brokerMap).map(b => {
        const pl = b.sell - b.buy;
        return { ...b, pl };
      }).sort((a, b) => b.sell + b.buy - (a.sell + a.buy))
    };
  }, [reportTransactions, selectedMarket]);

  const handleRunReport = (e) => {
    e.preventDefault();
    if (reportType === 'custom' && (!customFrom || !customTo)) {
      alert('Please choose both From and To dates.');
      return;
    }
    setReportRan(true);
  };

  const handleExportTransactionsCSV = () => {
    const headers = ['Date', 'Market', 'Script', 'Side', 'Broker', 'Qty', 'Rate', 'Total', 'TDS'];
    const rows = reportTransactions.map(t => [
      t.date,
      t.market.toUpperCase(),
      t.script,
      (t.side || 'buy').toUpperCase(),
      t.broker || '',
      t.qty || t.units || '',
      t.rate || t.nav || '',
      t.total,
      t.tds || 0
    ]);
    downloadCSV('report_transactions.csv', headers, rows);
  };

  // Helper for SVG Donut
  const renderDonut = (items, size = 200, title) => {
    const total = items.reduce((s, it) => s + it.value, 0);
    if (total <= 0) return <div className="empty">No data to display chart</div>;

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;
    const r2 = size * 0.24;
    let startAngle = -Math.PI / 2;

    const paths = items.map((it, idx) => {
      if (it.value <= 0) return null;
      const pct = it.value / total;
      const angle = pct * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const largeArc = angle > Math.PI ? 1 : 0;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const x3 = cx + r2 * Math.cos(endAngle);
      const y3 = cy + r2 * Math.sin(endAngle);
      const x4 = cx + r2 * Math.cos(startAngle);
      const y4 = cy + r2 * Math.sin(startAngle);

      const d = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 ${largeArc} 0 ${x4},${y4} Z`;
      const color = it.color || DONUT_COLORS[idx % DONUT_COLORS.length];
      startAngle = endAngle;

      return (
        <path key={it.label} d={d} fill={color} stroke="#fff" strokeWidth="1.5">
          <title>{`${it.label}: ₹${fmt(it.value)} (${(pct * 100).toFixed(1)}%)`}</title>
        </path>
      );
    });

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--green-dark)' }}>{title}</div>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {paths}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 800, fill: '#1b241a' }}>
            ₹{fmt(total)}
          </text>
        </svg>
        <div style={{ textAlign: 'left', maxWidth: size + 60, margin: '10px auto 0' }}>
          {items.slice(0, 5).map((it, idx) => (
            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 3 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: it.color || DONUT_COLORS[idx % DONUT_COLORS.length], flexShrink: 0 }}></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.label}: ₹{fmt(it.value)} ({((it.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="viewContainer">
      {/* REPORT FILTERS CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} color="#1f4d1f" />
            <span>Report Parameters &amp; Filters</span>
          </div>
        </div>

        <form onSubmit={handleRunReport}>
          <div className="filterBar" style={{ marginTop: 8 }}>
            <div className="fld" style={{ width: 170 }}>
              <label>Report Timeframe</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="fy">Fiscal Year (Apr–Mar)</option>
                <option value="custom">Custom Date Range</option>
                <option value="month">Monthly</option>
              </select>
            </div>

            {reportType === 'fy' && (
              <div className="fld" style={{ width: 220 }}>
                <label>Fiscal Year</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="btn small secondary"
                    onClick={() => setSelectedFy(prev => prev - 1)}
                  >
                    ◀
                  </button>
                  <select
                    style={{ flex: 1 }}
                    value={selectedFy}
                    onChange={e => setSelectedFy(parseInt(e.target.value, 10))}
                  >
                    {fyOptions.map(opt => (
                      <option key={opt.year} value={opt.year}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn small secondary"
                    onClick={() => setSelectedFy(prev => prev + 1)}
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}

            {reportType === 'custom' && (
              <>
                <div className="fld" style={{ width: 160 }}>
                  <label>From Date</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} required />
                </div>
                <div className="fld" style={{ width: 160 }}>
                  <label>To Date</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} required />
                </div>
              </>
            )}

            {reportType === 'month' && (
              <div className="fld" style={{ width: 170 }}>
                <label>Select Month</label>
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} required />
              </div>
            )}

            <div className="fld" style={{ width: 150 }}>
              <label>Market Category</label>
              <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
                <option value="">All Markets</option>
                <option value="crypto">Crypto</option>
                <option value="nse">NSE</option>
                <option value="mutualFund">Mutual Fund</option>
                <option value="metals">Metals</option>
                <option value="usStocks">US Stocks</option>
              </select>
            </div>

            <div className="fld" style={{ width: 180 }}>
              <label>Script (optional)</label>
              <select value={selectedScript} onChange={e => setSelectedScript(e.target.value)}>
                <option value="">All Scripts</option>
                {availableScripts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="fld" style={{ width: 180 }}>
              <label>Broker (optional)</label>
              <select value={selectedBroker} onChange={e => setSelectedBroker(e.target.value)}>
                <option value="">All Brokers</option>
                {availableBrokers.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn" style={{ height: 38 }}>
                Generate Report
              </button>
            </div>
          </div>
        </form>

        {/* Quick Broker Filter Chips */}
        <div style={{ marginTop: 8 }}>
          <div className="chipGroupLabel">Saved Brokers (click to filter):</div>
          <div className="brokerChips">
            <span
              className={`brokerChip ${selectedBroker === '' ? 'active' : ''}`}
              onClick={() => setSelectedBroker('')}
            >
              All Brokers
            </span>
            {availableBrokers.map(b => (
              <span
                key={b}
                className={`brokerChip ${selectedBroker === b ? 'active' : ''}`}
                onClick={() => setSelectedBroker(b)}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* REPORT OUTPUT */}
      {reportRan && (
        <div className="reportResultsContainer" id="reportResultsSection">
          {/* Summary Banner */}
          <div className="card" style={{ borderLeft: '5px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--green-dark)', fontSize: 17 }}>
                  Portfolio Performance Report
                </h3>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Time Period: <strong>{fmtDate(dateRange.from)}</strong> to <strong>{fmtDate(dateRange.to)}</strong>
                  {selectedMarket && <span> | Market: <strong>{selectedMarket.toUpperCase()}</strong></span>}
                </div>
              </div>
              <button
                className="btn small secondary"
                onClick={() => downloadPDF('Performance Report', '#reportResultsSection')}
              >
                <Printer size={14} style={{ marginRight: 4 }} />
                Print Full Report
              </button>
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="kpis">
            <div className="kpi">
              <div className="lbl">Total Turnover</div>
              <div className="val">{fmt(reportMetrics.turnover)}</div>
            </div>
            <div className="kpi">
              <div className="lbl">Total Buy Volume</div>
              <div className="val" style={{ color: '#1a5276' }}>{fmt(reportMetrics.buyTotal)}</div>
            </div>
            <div className="kpi">
              <div className="lbl">Total Sell Volume</div>
              <div className="val" style={{ color: '#c9782f' }}>{fmt(reportMetrics.sellTotal)}</div>
            </div>
            <div className="kpi">
              <div className="lbl">Net Realized P&L</div>
              <div className="val" style={{ color: reportMetrics.netPL >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                {reportMetrics.netPL >= 0 ? '+' : ''}{fmt(reportMetrics.netPL)}
              </div>
            </div>
          </div>

          {/* Donut Charts Section */}
          <div className="grid cols2" style={{ marginBottom: 16 }}>
            <div className="card">
              {renderDonut(
                reportMetrics.scriptSummary.map(s => ({ label: s.script, value: s.buy + s.sell })),
                210,
                'Volume Allocation by Script'
              )}
            </div>
            <div className="card">
              {renderDonut(
                [
                  { label: 'Buy Volume', value: reportMetrics.buyTotal, color: '#1a5276' },
                  { label: 'Sell Volume', value: reportMetrics.sellTotal, color: '#c9782f' }
                ],
                210,
                'Buy vs Sell Turnover Ratio'
              )}
            </div>
          </div>

          {/* Script-wise Breakdown */}
          <div className="card">
            <div className="cardTitle">
              <span>Script-wise Performance Breakdown ({reportMetrics.scriptSummary.length})</span>
            </div>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Script</th>
                    <th>Market</th>
                    <th>Buy Qty</th>
                    <th>Sell Qty</th>
                    <th>Total Buy (₹)</th>
                    <th>Total Sell (₹)</th>
                    <th>Gross P&L (₹)</th>
                    <th>1% TDS (₹)</th>
                    <th>Est. Tax (₹)</th>
                    <th>Net P&L (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportMetrics.scriptSummary.length === 0 ? (
                    <tr><td colSpan="10" className="empty">No script activity in selected period.</td></tr>
                  ) : (
                    reportMetrics.scriptSummary.map(s => (
                      <tr key={s.script}>
                        <td><strong>{s.script}</strong></td>
                        <td><span className="tag system">{s.market ? s.market.toUpperCase() : 'CRYPTO'}</span></td>
                        <td>{fmt(s.buyQty)}</td>
                        <td>{fmt(s.sellQty)}</td>
                        <td>{fmt(s.buy)}</td>
                        <td>{fmt(s.sell)}</td>
                        <td className={s.pl >= 0 ? 'pos' : 'neg'}>{fmt(s.pl)}</td>
                        <td style={{ color: 'var(--red)' }}>{fmt(s.tds)}</td>
                        <td>{fmt(s.tax)}</td>
                        <td className={s.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
                          {fmt(s.net)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Transactions in Period */}
          <div className="card">
            <div className="cardTitle">
              <span>Transaction Log ({reportTransactions.length} entries)</span>
              <button className="btn small secondary" onClick={handleExportTransactionsCSV}>
                <Download size={14} style={{ marginRight: 4 }} />
                Export Transactions CSV
              </button>
            </div>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Market</th>
                    <th>Script</th>
                    <th>Side</th>
                    <th>Broker</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total (₹)</th>
                    <th>TDS (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{fmtDate(t.date)}</td>
                      <td><span className="tag system">{t.market ? t.market.toUpperCase() : 'CRYPTO'}</span></td>
                      <td><strong>{t.script}</strong></td>
                      <td><span className={`tag ${t.side}`}>{t.side.toUpperCase()}</span></td>
                      <td>{t.broker || '—'}</td>
                      <td>{fmt(t.qty || t.units || 0)}</td>
                      <td>{fmt(t.rate || t.nav || 0)}</td>
                      <td><strong>{fmt(t.total)}</strong></td>
                      <td>{t.side === 'sell' && t.tds ? fmt(t.tds) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
