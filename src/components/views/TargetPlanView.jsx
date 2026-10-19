import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtPlain } from '../../utils/formatters';
import {
  TP_TOTAL_MONTHS,
  TP_MONTH_NAMES,
  tpCalendar,
  getFiscalYearSlices,
  generateDefaultTargetForMarket,
  recalcTargetFrom,
  MARKET_LABELS,
  MARKET_TP_KEYS
} from '../../utils/targetPlan';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { RotateCcw, Download, Printer, Target, Sparkles } from 'lucide-react';

const MARKETS = ['crypto', 'nse', 'mutualFund', 'metals', 'usStocks'];

export default function TargetPlanView() {
  const { data, updateData, showNotification } = useApp();

  const [selectedMarket, setSelectedMarket] = useState('crypto');
  const [currentYearIdx, setCurrentYearIdx] = useState(0); // 0-indexed slice

  const marketKey = MARKET_TP_KEYS[selectedMarket] || 'targetPlanCrypto';

  const plan = useMemo(() => {
    const raw = data?.[marketKey];
    if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    return generateDefaultTargetForMarket(selectedMarket);
  }, [data, marketKey, selectedMarket]);

  const slices = useMemo(() => {
    return getFiscalYearSlices(plan.length || TP_TOTAL_MONTHS);
  }, [plan.length]);

  const activeSlice = useMemo(() => {
    return slices[currentYearIdx] || slices[0] || { startIdx: 0, endIdx: 12, label: '26-27' };
  }, [slices, currentYearIdx]);

  const visibleMonths = useMemo(() => {
    return plan.slice(activeSlice.startIdx, activeSlice.endIdx);
  }, [plan, activeSlice]);

  const handleCellEdit = (monthIdx, field, val) => {
    const num = parseFloat(val) || 0;
    const newPlan = plan.map(item => ({ ...item }));
    if (!newPlan[monthIdx]) return;

    newPlan[monthIdx][field] = num;
    const recalculated = recalcTargetFrom(newPlan, monthIdx);

    updateData(prev => ({
      ...prev,
      [marketKey]: recalculated
    }));
  };

  const handleResetDefault = () => {
    if (!window.confirm(`Reset ${MARKET_LABELS[selectedMarket]} target plan to default compounding values?`)) return;
    const defaultPlan = generateDefaultTargetForMarket(selectedMarket);
    updateData(prev => ({
      ...prev,
      [marketKey]: defaultPlan
    }));
    showNotification(`Reset ${MARKET_LABELS[selectedMarket]} plan to default`);
  };

  const handleExportCSV = () => {
    const headers = ['Mth', 'Period', 'Monthly Invest (₹)', 'Total Invest (₹)', 'Target %', 'Target Profit (₹)', 'Total Balance (₹)', 'Withdrawal (₹)', 'Real Balance (₹)'];
    const rows = plan.map((t, idx) => {
      const c = tpCalendar(idx);
      return [
        t.month,
        `${TP_MONTH_NAMES[c.mn]} ${c.yr}`,
        t.monthlyInvest,
        t.totalInvest.toFixed(2),
        t.targetPercentage,
        t.targetProfit.toFixed(2),
        t.totalBalance.toFixed(2),
        t.targetWithdrawal,
        t.realBalance.toFixed(2)
      ];
    });
    downloadCSV(`target_plan_${selectedMarket}.csv`, headers, rows);
  };

  return (
    <div className="viewContainer">
      {/* MARKET SELECTOR TABS */}
      <div className="marketTypeBox">
        {MARKETS.map(m => (
          <button
            key={m}
            className={`marketTypeBtn ${selectedMarket === m ? 'active' : ''}`}
            onClick={() => {
              setSelectedMarket(m);
              setCurrentYearIdx(0);
            }}
          >
            <span className="mtIcon">
              {m === 'crypto' ? '₿' : m === 'nse' ? '📈' : m === 'mutualFund' ? '📊' : m === 'metals' ? '🥇' : '🇺🇸'}
            </span>
            <span className="mtLabel">{MARKET_LABELS[m]}</span>
          </button>
        ))}
      </div>

      <div className="helpNote">
        Compounding target plan per market type. Edit any <strong>Monthly Invest</strong>, <strong>Target %</strong> or <strong>Withdrawal</strong> cell — later months recalculate automatically. Fiscal year runs Apr–Mar; plan starts Sep 2026.
      </div>

      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="#1f4d1f" />
            <span>Target Plan Controls — {MARKET_LABELS[selectedMarket]}</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleResetDefault}>
              <RotateCcw size={14} style={{ marginRight: 4 }} />
              Reset Default
            </button>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF(`${MARKET_LABELS[selectedMarket]} Target Plan`, '#targetPlanTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              PDF
            </button>
          </div>
        </div>

        {/* Year Tabs */}
        <div className="yearTabs" style={{ marginTop: 6, marginBottom: 16 }}>
          {slices.map((s, i) => (
            <button
              key={s.label}
              className={`yearTabBtn ${i === currentYearIdx ? 'active' : ''}`}
              onClick={() => setCurrentYearIdx(i)}
            >
              FY {s.label}
            </button>
          ))}
        </div>

        <div className="tableWrap" id="targetPlanTable">
          <table>
            <thead>
              <tr>
                <th>Mth</th>
                <th>Period</th>
                <th>Monthly Invest (₹)</th>
                <th>Total Invest (₹)</th>
                <th>Target %</th>
                <th>Target Profit (₹)</th>
                <th>Total Balance (₹)</th>
                <th>Withdrawal (₹)</th>
                <th>Real Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {visibleMonths.map((t, relIdx) => {
                const absIdx = activeSlice.startIdx + relIdx;
                const c = tpCalendar(absIdx);
                const periodLabel = `${TP_MONTH_NAMES[c.mn]} ${c.yr}`;

                return (
                  <tr key={t.month}>
                    <td><strong>{t.month}</strong></td>
                    <td>{periodLabel}</td>
                    <td>
                      <input
                        type="number"
                        className="tpInput"
                        value={t.monthlyInvest}
                        onChange={e => handleCellEdit(absIdx, 'monthlyInvest', e.target.value)}
                      />
                    </td>
                    <td><strong>{fmt(t.totalInvest)}</strong></td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="tpInput"
                        style={{ width: 60 }}
                        value={t.targetPercentage}
                        onChange={e => handleCellEdit(absIdx, 'targetPercentage', e.target.value)}
                      />
                      %
                    </td>
                    <td className="pos">+{fmt(t.targetProfit)}</td>
                    <td>{fmt(t.totalBalance)}</td>
                    <td>
                      <input
                        type="number"
                        className="tpInput"
                        value={t.targetWithdrawal}
                        onChange={e => handleCellEdit(absIdx, 'targetWithdrawal', e.target.value)}
                      />
                    </td>
                    <td style={{ color: 'var(--green-dark)', fontWeight: 800 }}>
                      {fmt(t.realBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
