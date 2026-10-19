import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import NavigationTabs from './components/NavigationTabs';
import LoginScreen from './components/LoginScreen';
import BackupModal from './components/BackupModal';
import InvoiceModal from './components/InvoiceModal';

// Views
import CryptoEntryView from './components/views/CryptoEntryView';
import NseEntryView from './components/views/NseEntryView';
import UsStocksEntryView from './components/views/UsStocksEntryView';
import ScriptEntryView from './components/views/ScriptEntryView';
import MutualFundView from './components/views/MutualFundView';
import MetalsView from './components/views/MetalsView';
import LedgerView from './components/views/LedgerView';
import TargetPlanView from './components/views/TargetPlanView';
import MergedView from './components/views/MergedView';
import ReportsView from './components/views/ReportsView';

function AppContent() {
  const { currentUser, activeView, statusMsg } = useApp();

  if (!currentUser) {
    return <LoginScreen />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'cryptoEntry':
        return <CryptoEntryView />;
      case 'nseEntry':
        return <NseEntryView />;
      case 'usStocksEntry':
        return <UsStocksEntryView />;
      case 'scriptEntry':
        return <ScriptEntryView />;
      case 'mutualFund':
        return <MutualFundView />;
      case 'metals':
        return <MetalsView />;
      case 'ledger':
        return <LedgerView />;
      case 'targetPlan':
        return <TargetPlanView />;
      case 'mergedView':
        return <MergedView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <CryptoEntryView />;
    }
  };

  return (
    <div className="appContainer">
      <Navbar />
      <NavigationTabs />

      <main className="mainContent">
        {renderActiveView()}
      </main>

      {/* Global Modals */}
      <BackupModal />
      <InvoiceModal />

      {/* Floating Status Notification Toast */}
      {statusMsg && (
        <div className="statusToast">
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
