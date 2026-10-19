export function computeScriptPL(entries = []) {
  const map = {};
  entries.forEach(e => {
    if (!e.script) return;
    if (!map[e.script]) {
      map[e.script] = {
        buy: 0,
        sell: 0,
        buyCount: 0,
        sellCount: 0,
        buyQty: 0,
        sellQty: 0,
        tds: 0,
        market: e.market || 'crypto'
      };
    }
    const item = map[e.script];
    if (e.side === 'buy') {
      item.buy += Number(e.total) || 0;
      item.buyCount++;
      item.buyQty += Number(e.qty) || 0;
    } else {
      item.sell += Number(e.total) || 0;
      item.sellCount++;
      item.sellQty += Number(e.qty) || 0;
      item.tds += Number(e.tds) || 0;
    }
    item.market = e.market || 'crypto';
  });

  // Calculate pl, balQty, tax
  Object.keys(map).forEach(s => {
    const d = map[s];
    d.pl = d.sell - d.buy;
    d.balQty = d.buyQty - d.sellQty;
    const isCrypto = d.market === 'crypto';
    const taxRate = isCrypto ? 0.30 : 0.125;
    d.tax = d.pl > 0 ? d.pl * taxRate : 0;
    d.net = d.pl - d.tax;
  });

  return map;
}

export function computeBrokerPL(entries = [], plMarket = 'crypto', nseTaxPct = 12.5) {
  const map = {};
  entries.forEach(e => {
    const key = e.broker || 'Unassigned';
    if (!map[key]) {
      map[key] = { buy: 0, sell: 0, tds: 0, markets: {}, count: 0 };
    }
    const b = map[key];
    const m = e.market || 'crypto';
    b.markets[m] = true;
    if (e.side === 'buy') {
      b.buy += Number(e.total) || 0;
    } else {
      b.sell += Number(e.total) || 0;
      b.tds += Number(e.tds) || 0;
    }
    b.count++;
  });

  Object.keys(map).forEach(bKey => {
    const d = map[bKey];
    d.pl = d.sell - d.buy;
    const mkts = Object.keys(d.markets);
    const hasCrypto = mkts.includes('crypto');
    const hasNse = mkts.includes('nse');
    const taxRate = (hasCrypto && !hasNse) ? 30 : (!hasCrypto && hasNse) ? nseTaxPct : 30;
    d.taxRate = taxRate;
    d.tax = d.pl > 0 ? d.pl * (taxRate / 100) : 0;
    d.net = d.pl - d.tax;
  });

  return map;
}

export function computeLedgerPLSummary(data, market = 'crypto') {
  let ledgerEntries = [];
  let tradeEntries = [];

  if (market === 'crypto') {
    ledgerEntries = data.ledgerCrypto || [];
    tradeEntries = data.cryptoEntries || [];
  } else if (market === 'nse') {
    ledgerEntries = data.ledgerNse || [];
    tradeEntries = data.nseEntries || [];
  } else if (market === 'mutualFund') {
    ledgerEntries = data.ledgerMF || [];
    tradeEntries = data.mutualFund || [];
  } else if (market === 'metals') {
    ledgerEntries = data.ledgerMetals || [];
    tradeEntries = data.metals || [];
  } else if (market === 'usStocks') {
    ledgerEntries = data.ledgerUsStocks || [];
    tradeEntries = data.usStocksEntries || [];
  }

  // Ledger totals
  let totalInvest = 0;
  let totalWithdraw = 0;
  ledgerEntries.forEach(e => {
    const amt = Number(e.amount) || 0;
    if (e.type === 'invest') totalInvest += amt;
    else if (e.type === 'withdraw') totalWithdraw += amt;
  });

  // Trading totals
  let totalBuy = 0;
  let totalSell = 0;
  if (market === 'mutualFund') {
    totalBuy = tradeEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  } else {
    tradeEntries.forEach(e => {
      const tot = Number(e.total) || 0;
      if (e.side === 'buy') totalBuy += tot;
      else totalSell += tot;
    });
  }

  const netPL = totalSell - totalBuy;
  const netCapital = totalInvest - totalWithdraw;
  const balance = netCapital + netPL;
  const plPct = totalInvest > 0 ? (netPL / totalInvest) * 100 : 0;

  return {
    totalInvest,
    totalWithdraw,
    netCapital,
    totalBuy,
    totalSell,
    netPL,
    balance,
    plPct,
    entriesCount: ledgerEntries.length
  };
}
