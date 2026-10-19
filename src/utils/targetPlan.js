export const TP_START_YEAR = 2026;
export const TP_START_MONTH = 8; // September (0-indexed: 8)
export const TP_TOTAL_MONTHS = 132; // Sep 2026 → Aug 2037 (covers FY 26-27 through FY 36-37)

export const TP_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const TP_MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const MARKET_LABELS = {
  crypto: 'Crypto',
  nse: 'NSE',
  mutualFund: 'Mutual Fund',
  metals: 'Metals',
  usStocks: 'US Stocks'
};

export const MARKET_TP_KEYS = {
  crypto: 'targetPlanCrypto',
  nse: 'targetPlanNse',
  mutualFund: 'targetPlanMf',
  metals: 'targetPlanMetals',
  usStocks: 'targetPlanUsStocks'
};

export function tpCalendar(idx) {
  const mn = (TP_START_MONTH + idx) % 12;
  const yr = TP_START_YEAR + Math.floor((TP_START_MONTH + idx) / 12);
  return { mn, yr };
}

export function fyStartOf(yr, mn1) {
  // mn1: 1-12
  return mn1 >= 4 ? yr : yr - 1;
}

export function fyLabel(fyStartYear) {
  const y1 = String(fyStartYear).slice(-2);
  const y2 = String(fyStartYear + 1).slice(-2);
  return `${y1}-${y2}`;
}

export function getFiscalYearSlices(totalMonths = TP_TOTAL_MONTHS) {
  const slices = [];
  let idx = 0;
  while (idx < totalMonths) {
    const c0 = tpCalendar(idx);
    const fy = fyStartOf(c0.yr, c0.mn + 1);
    const label = fyLabel(fy);
    let count = 0;
    let ci = idx;
    while (ci < totalMonths) {
      const c = tpCalendar(ci);
      if (fyStartOf(c.yr, c.mn + 1) !== fy) break;
      count++;
      ci++;
    }
    if (count === 0) break;
    slices.push({ label, startIdx: idx, endIdx: idx + count });
    idx += count;
  }
  return slices;
}

export function generateDefaultTargetForMarket(market) {
  const plan = [];
  let prevRealBalance = 0;
  for (let m = 1; m <= TP_TOTAL_MONTHS; m++) {
    let monthlyInvest = 5000;
    let targetPercentage = 10;
    let targetWithdrawal = 0;

    if (market === 'crypto') {
      if (m <= 12) { monthlyInvest = 5000; targetPercentage = 10; targetWithdrawal = 0; }
      else if (m <= 24) { monthlyInvest = 7500; targetPercentage = 10; targetWithdrawal = m > 18 ? 2000 : 0; }
      else if (m <= 36) { monthlyInvest = 10000; targetPercentage = 10; targetWithdrawal = 3000; }
      else if (m <= 48) { monthlyInvest = 12500; targetPercentage = 10; targetWithdrawal = 5000; }
      else if (m <= 60) { monthlyInvest = 15000; targetPercentage = 10; targetWithdrawal = 7500; }
      else if (m <= 72) { monthlyInvest = 17500; targetPercentage = 10; targetWithdrawal = 10000; }
      else if (m <= 84) { monthlyInvest = 20000; targetPercentage = 10; targetWithdrawal = 12500; }
      else if (m <= 96) { monthlyInvest = 22500; targetPercentage = 10; targetWithdrawal = 15000; }
      else if (m <= 108) { monthlyInvest = 25000; targetPercentage = 10; targetWithdrawal = 17500; }
      else if (m <= 120) { monthlyInvest = 30000; targetPercentage = 10; targetWithdrawal = 20000; }
      else { monthlyInvest = 35000; targetPercentage = 10; targetWithdrawal = 25000; }
    } else if (market === 'nse') {
      if (m <= 12) { monthlyInvest = 10000; targetPercentage = 5; targetWithdrawal = 0; }
      else if (m <= 24) { monthlyInvest = 12500; targetPercentage = 5; targetWithdrawal = 0; }
      else if (m <= 36) { monthlyInvest = 15000; targetPercentage = 5; targetWithdrawal = 2000; }
      else if (m <= 48) { monthlyInvest = 17500; targetPercentage = 5; targetWithdrawal = 3000; }
      else if (m <= 60) { monthlyInvest = 20000; targetPercentage = 5; targetWithdrawal = 5000; }
      else if (m <= 72) { monthlyInvest = 22500; targetPercentage = 5; targetWithdrawal = 7000; }
      else if (m <= 84) { monthlyInvest = 25000; targetPercentage = 5; targetWithdrawal = 9000; }
      else if (m <= 96) { monthlyInvest = 27500; targetPercentage = 5; targetWithdrawal = 11000; }
      else if (m <= 108) { monthlyInvest = 30000; targetPercentage = 5; targetWithdrawal = 13000; }
      else if (m <= 120) { monthlyInvest = 35000; targetPercentage = 5; targetWithdrawal = 15000; }
      else { monthlyInvest = 40000; targetPercentage = 5; targetWithdrawal = 18000; }
    } else if (market === 'usStocks') {
      if (m <= 12) { monthlyInvest = 10000; targetPercentage = 5; targetWithdrawal = 0; }
      else if (m <= 24) { monthlyInvest = 12500; targetPercentage = 5; targetWithdrawal = 0; }
      else if (m <= 36) { monthlyInvest = 15000; targetPercentage = 5; targetWithdrawal = 2000; }
      else if (m <= 48) { monthlyInvest = 17500; targetPercentage = 5; targetWithdrawal = 3000; }
      else if (m <= 60) { monthlyInvest = 20000; targetPercentage = 5; targetWithdrawal = 5000; }
      else if (m <= 72) { monthlyInvest = 22500; targetPercentage = 5; targetWithdrawal = 7000; }
      else if (m <= 84) { monthlyInvest = 25000; targetPercentage = 5; targetWithdrawal = 9000; }
      else if (m <= 96) { monthlyInvest = 27500; targetPercentage = 5; targetWithdrawal = 11000; }
      else if (m <= 108) { monthlyInvest = 30000; targetPercentage = 5; targetWithdrawal = 13000; }
      else if (m <= 120) { monthlyInvest = 35000; targetPercentage = 5; targetWithdrawal = 15000; }
      else { monthlyInvest = 40000; targetPercentage = 5; targetWithdrawal = 18000; }
    } else if (market === 'mutualFund') {
      if (m <= 12) { monthlyInvest = 5000; targetPercentage = 3; targetWithdrawal = 0; }
      else if (m <= 24) { monthlyInvest = 7500; targetPercentage = 3; targetWithdrawal = 0; }
      else if (m <= 36) { monthlyInvest = 10000; targetPercentage = 3; targetWithdrawal = 0; }
      else if (m <= 48) { monthlyInvest = 12500; targetPercentage = 3; targetWithdrawal = 2000; }
      else if (m <= 60) { monthlyInvest = 15000; targetPercentage = 3; targetWithdrawal = 3000; }
      else if (m <= 72) { monthlyInvest = 17500; targetPercentage = 3; targetWithdrawal = 5000; }
      else if (m <= 84) { monthlyInvest = 20000; targetPercentage = 3; targetWithdrawal = 7000; }
      else if (m <= 96) { monthlyInvest = 22500; targetPercentage = 3; targetWithdrawal = 9000; }
      else if (m <= 108) { monthlyInvest = 25000; targetPercentage = 3; targetWithdrawal = 11000; }
      else if (m <= 120) { monthlyInvest = 30000; targetPercentage = 3; targetWithdrawal = 13000; }
      else { monthlyInvest = 35000; targetPercentage = 3; targetWithdrawal = 15000; }
    } else { // metals
      if (m <= 12) { monthlyInvest = 3000; targetPercentage = 4; targetWithdrawal = 0; }
      else if (m <= 24) { monthlyInvest = 5000; targetPercentage = 4; targetWithdrawal = 0; }
      else if (m <= 36) { monthlyInvest = 7000; targetPercentage = 4; targetWithdrawal = 1000; }
      else if (m <= 48) { monthlyInvest = 9000; targetPercentage = 4; targetWithdrawal = 2000; }
      else if (m <= 60) { monthlyInvest = 11000; targetPercentage = 4; targetWithdrawal = 3000; }
      else if (m <= 72) { monthlyInvest = 13000; targetPercentage = 4; targetWithdrawal = 5000; }
      else if (m <= 84) { monthlyInvest = 15000; targetPercentage = 4; targetWithdrawal = 7000; }
      else if (m <= 96) { monthlyInvest = 17000; targetPercentage = 4; targetWithdrawal = 9000; }
      else if (m <= 108) { monthlyInvest = 19000; targetPercentage = 4; targetWithdrawal = 11000; }
      else if (m <= 120) { monthlyInvest = 22000; targetPercentage = 4; targetWithdrawal = 13000; }
      else { monthlyInvest = 25000; targetPercentage = 4; targetWithdrawal = 15000; }
    }

    const totalInvest = (m === 1) ? monthlyInvest : prevRealBalance + monthlyInvest;
    const targetProfit = totalInvest * (targetPercentage / 100);
    const totalBalance = totalInvest + targetProfit;
    const realBalance = totalBalance - targetWithdrawal;
    prevRealBalance = realBalance;

    plan.push({
      month: m,
      monthlyInvest,
      totalInvest,
      targetPercentage,
      targetProfit,
      totalBalance,
      targetWithdrawal,
      realBalance
    });
  }
  return plan;
}

export function recalcTargetFrom(plan, idx = 0) {
  const newPlan = plan.map(item => ({ ...item }));
  for (let j = idx; j < newPlan.length; j++) {
    const t = newPlan[j];
    const totalInvest = (j === 0) ? t.monthlyInvest : newPlan[j - 1].realBalance + t.monthlyInvest;
    const profit = totalInvest * (t.targetPercentage / 100);
    const totalBalance = totalInvest + profit;
    const realBalance = totalBalance - t.targetWithdrawal;

    t.totalInvest = totalInvest;
    t.targetProfit = profit;
    t.totalBalance = totalBalance;
    t.realBalance = realBalance;
  }
  return newPlan;
}
