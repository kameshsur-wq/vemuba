import React from 'react';
import { useApp } from '../context/AppContext';

const TABS = [
  { id: 'cryptoEntry', label: 'Crypto Entry', icon: '₿' },
  { id: 'nseEntry', label: 'NSE Entry', icon: '📈' },
  { id: 'usStocksEntry', label: 'US Stocks Entry', icon: '🇺🇸' },
  { id: 'scriptEntry', label: 'Script Entry (OHLC)', icon: '📊' },
  { id: 'mutualFund', label: 'Mutual Fund', icon: '📑' },
  { id: 'metals', label: 'Metals', icon: '🥇' },
  { id: 'ledger', label: 'Investment Ledger', icon: '📒' },
  { id: 'targetPlan', label: 'Target Plan', icon: '🎯' },
  { id: 'mergedView', label: 'Merged View', icon: '📎' },
  { id: 'reports', label: 'Reports', icon: '📋' },
];

export default function NavigationTabs() {
  const { activeView, setActiveView } = useApp();

  return (
    <nav className="navTabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`navTab ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => setActiveView(tab.id)}
        >
          <span className="tabIcon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
