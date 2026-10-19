import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt } from '../../utils/formatters';
import {
  TP_TOTAL_MONTHS,
  TP_MONTH_NAMES,
  tpCalendar,
  getFiscalYearSlices,
  generateDefaultTargetForMarket,
  MARKET_LABELS,
  MARKET_TP_KEYS
} from '../../utils/targetPlan';
import { downloadCSV, downloadPDF } from '../../utils/exportHelpers';
import { Download, Printer, Layers } from 'lucide-react';

const MARKETS = ['crypto', 'nse', 'mutualFund', 'metals', 'usStocks'];

export default function MergedView() {
  const { data } = useApp();

  const [selectedMarket, setSelectedMarket] = useState('crypto');
  const [currentYearIdx, setCurrentYearIdx] = useState(0);

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

  // Map ledger & spot entries to year-months
  const { investByYm, withdrawByYm, plByYm } = useMemo(() => {
    const invMap = {};
    const withMap = {};
    const plMap = {};

    let ledgerEntries = [];
    let tradeEntries = [];

    if (selectedMarket === 'crypto') {
      ledgerEntries = data?.ledgerCrypto || data?.ledger || [];
      tradeEntries = data?.cryptoEntries || data?.spotEntries || [];
    } else if (selectedMarket === 'nse') {
      ledgerEntries = data?.ledgerNse || [];
      tradeEntries = data?.nseEntries || [];
    } else if (selectedMarket === 'mutualFund') {
      ledgerEntries = data?.ledgerMF || [];
      tradeEntries = data?.mutualFund || [];
    } else if (selectedMarket === 'metals') {
      ledgerEntries = data?.ledgerMetals || [];
      tradeEntries = data?.metals || [];
    } else if (selectedMarket === 'usStocks') {
      ledgerEntries = data?.ledgerUsStocks || [];
      tradeEntries = data?.usStocksEntries || [];
    }

    ledgerEntries.forEach(e => {
      if (!e.date) return;
      const ym = e.date.substring(0, 7);
      const amt = Number(e.amount) || 0;
      if (e.type === 'invest') invMap[ym] = (invMap[ym] || 0) + amt;
      else withMap[ym] = (withMap[ym] || 0) + amt;
    });

    tradeEntries.forEach(e => {
      if (!e.date) return;
      const ym = e.date.substring(0, 7);
      if (!plMap[ym]) plMap[ym] = { buy: 0, sell: 0 };
      const tot = Number(e.total || e.amount) || 0;
      if (e.side === 'buy') plMap[ym].buy += tot;
      else plMap[ym].sell += tot;
    });

    return { investByYm: invMap, withdrawByYm: withMap, plByYm: plMap };
  }, [data, selectedMarket]);

  // Calculate cumulative rows across the entire plan
  const allRows = useMemo(() => {
    let cumActInvest = 0;
    let cumActWithdraw = 0;
    let cumActProfitGross = 0;
    let cumActProfitNet = 0;

    return plan.map((t, idx) => {
      const c = tpCalendar(idx);
      const ym = `${c.yr}-${String(c.mn + 1).padStart(2, '0')}`;
      const actInvest = investByYm[ym] || 0;
      const actWithdraw = withdrawByYm[ym] || 0;
      const pl = plByYm[ym] || { buy: 0, sell: 0 };
      const grossProfit = pl.sell - pl.buy;
      const taxRate = selectedMarket === 'crypto' ? 0.30 : 0.125;
      const tax = grossProfit > 0 ? grossProfit * taxRate : 0;
      const netProfit = grossProfit - tax;

      cumActInvest += actInvest;
      cumActWithdraw += actWithdraw;
      cumActProfitGross += grossProfit;
      cumActProfitNet += netProfit;

      const actBalGross = cumActInvest - cumActWithdraw + cumActProfitGross;
      const actBalNet = cumActInvest - cumActWithdraw + cumActProfitNet;

      return {
        idx,
        ym,
        monthLabel: `${TP_MONTH_NAMES[c.mn]} ${c.yr}`,
        t,
        actInvest,
        cumActInvest,
        grossProfit,
        tax,
        netProfit,
        actWithdraw,
        actBalGross,
        actBalNet
      };
    });
  }, [plan, investByYm, withdrawByYm, plByYm, selectedMarket]);

  // Overall KPIs to-date
  const kpis = useMemo(() => {
    const tgtProfit = plan.reduce((s, t) => s + (t.targetProfit || 0), 0);
    const actGross = allRows.reduce((s, r) => s + r.grossProfit, 0);
    const actNet = allRows.reduce((s, r) => s + r.netProfit, 0);
    const tax = allRows.reduce((s, r) => s + r.tax, 0);
    return { tgtProfit, actGross, actNet, tax };
  }, [plan, allRows]);

  // Active slice visible rows
  const visibleSliceRows = useMemo(() => {
    return allRows.slice(activeSlice.startIdx, activeSlice.endIdx);
  }, [allRows, activeSlice]);

  // FY totals
  const fyTotals = useMemo(() => {
    return {
      tgtInvest: visibleSliceRows.reduce((s, r) => s + r.t.monthlyInvest, 0),
      actInvest: visibleSliceRows.reduce((s, r) => s + r.actInvest, 0),
      tgtProfit: visibleSliceRows.reduce((s, r) => s + r.t.targetProfit, 0),
      gross: visibleSliceRows.reduce((s, r) => s + r.grossProfit, 0),
      net: visibleSliceRows.reduce((s, r) => s + r.netProfit, 0)
    };
  }, [visibleSliceRows]);

  const handleExportCSV = () => {
    const headers = [
      'Month', 'Tgt Invest', 'Act Invest', 'Tgt Tot Invest', 'Act Tot Invest', 'Tgt %', 'Tgt Profit',
      'Act Profit (Before Tax)', 'Act Profit (After Tax)', 'Tgt Real Bal', 'Act Bal (Before Tax)', 'Act Bal (After Tax)'
    ];
    const rows = allRows.map(r => [
      r.monthLabel,
      r.t.monthlyInvest,
      r.actInvest,
      r.t.totalInvest.toFixed(2),
      r.cumActInvest.toFixed(2),
      r.t.targetPercentage,
      r.t.targetProfit.toFixed(2),
      r.grossProfit.toFixed(2),
      r.netProfit.toFixed(2),
      r.t.realBalance.toFixed(2),
      r.actBalGross.toFixed(2),
      r.actBalNet.toFixed(2)
    ]);
    downloadCSV(`merged_view_${selectedMarket}.csv`, headers, rows);
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
        Actual Invest/Withdrawal come from the Investment Ledger. Actual Profit is the period's Sell − Buy value from trade entries, shown both before tax and after tax.
      </div>

      {/* KPIS */}
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Target Profit To-Date</div>
          <div className="val" style={{ color: 'var(--green-dark)' }}>{fmt(kpis.tgtProfit)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Actual Profit To-Date (Before Tax)</div>
          <div className="val" style={{ color: '#1a5276' }}>{fmt(kpis.actGross)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Actual Profit To-Date (After Tax)</div>
          <div className="val" style={{ color: '#c9782f' }}>{fmt(kpis.actNet)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Tax Paid / Accrued To-Date</div>
          <div className="val" style={{ color: 'var(--red)' }}>{fmt(kpis.tax)}</div>
        </div>
      </div>

      {/* MERGED TABLE CARD */}
      <div className="card">
        <div className="cardTitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#1f4d1f" />
            <span>Target Plan vs Actual ({MARKET_LABELS[selectedMarket]})</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small secondary" onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: 4 }} />
              Export CSV
            </button>
            <button className="btn small secondary" onClick={() => downloadPDF(`${MARKET_LABELS[selectedMarket]} Merged View`, '#mergedViewTable')}>
              <Printer size={14} style={{ marginRight: 4 }} />
              Print PDF
            </button>
          </div>
        </div>

        <div className="mergedLegend" style={{ margin: '8px 0 14px' }}>
          <span><span className="dot" style={{ background: '#3f7d32' }}></span>Target Plan</span>
          <span><span className="dot" style={{ background: '#1a5276' }}></span>Actual — Before Tax</span>
          <span><span className="dot" style={{ background: '#c9782f' }}></span>Actual — After Tax</span>
        </div>

        {/* Year Tabs */}
        <div className="yearTabs" style={{ marginBottom: 16 }}>
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

        <div className="tableWrap" id="mergedViewTable">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th className="tgt">Tgt Invest</th>
                <th className="actg">Act Invest</th>
                <th className="tgt">Tgt Tot Invest</th>
                <th className="actg">Act Tot Invest</th>
                <th className="tgt">Tgt %</th>
                <th className="tgt">Tgt Profit</th>
                <th className="actg">Act Profit (Gross)</th>
                <th className="actn">Act Profit (Net)</th>
                <th className="tgt">Tgt Real Bal</th>
                <th className="actg">Act Bal (Gross)</th>
                <th className="actn">Act Bal (Net)</th>
              </tr>
            </thead>
            <tbody>
              {visibleSliceRows.map(r => (
                <tr key={r.idx}>
                  <td><strong>{r.monthLabel}</strong></td>
                  <td className="text-right" style={{ color: 'var(--green)' }}>{fmt(r.t.monthlyInvest)}</td>
                  <td className="text-right" style={{ color: '#1a5276', fontWeight: 600 }}>{fmt(r.actInvest)}</td>
                  <td className="text-right" style={{ color: 'var(--green)' }}>{fmt(r.t.totalInvest)}</td>
                  <td className="text-right" style={{ color: '#1a5276', fontWeight: 600 }}>{fmt(r.cumActInvest)}</td>
                  <td className="text-right" style={{ color: 'var(--gold)' }}>{r.t.targetPercentage}%</td>
                  <td className="text-right pos">{fmt(r.t.targetProfit)}</td>
                  <td className={`text-right ${r.grossProfit >= 0 ? 'pos' : 'neg'}`}>{fmt(r.grossProfit)}</td>
                  <td className={`text-right ${r.netProfit >= 0 ? 'pos' : 'neg'}`} style={{ fontWeight: 700 }}>
                    {fmt(r.netProfit)}
                  </td>
                  <td className="text-right" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>
                    {fmt(r.t.realBalance)}
                  </td>
                  <td className={`text-right ${r.actBalGross >= 0 ? 'pos' : 'neg'}`}>{fmt(r.actBalGross)}</td>
                  <td className={`text-right ${r.actBalNet >= 0 ? 'pos' : 'neg'}`} style={{ fontWeight: 800 }}>
                    {fmt(r.actBalNet)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 800, background: 'var(--green-light)' }}>
                <td>FY {activeSlice.label} Total</td>
                <td className="text-right">{fmt(fyTotals.tgtInvest)}</td>
                <td className="text-right">{fmt(fyTotals.actInvest)}</td>
                <td colSpan="3"></td>
                <td className="text-right">{fmt(fyTotals.tgtProfit)}</td>
                <td className={`text-right ${fyTotals.gross >= 0 ? 'pos' : 'neg'}`}>{fmt(fyTotals.gross)}</td>
                <td className={`text-right ${fyTotals.net >= 0 ? 'pos' : 'neg'}`}>{fmt(fyTotals.net)}</td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
