import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { simpleHash } from '../utils/auth';
import { generateDefaultTargetForMarket } from '../utils/targetPlan';
import defaultUsersList from '../data/defaultUsers.json';
import defaultDataObj from '../data/defaultData.json';

const USERS_KEY = 'vemuba_users_v1';
const SESSION_KEY = 'vemuba_session_v1';
const IDB_NAME = 'vemuba_fs';
const IDB_STORE = 'handles';

const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

// IndexedDB helpers for Directory Handle
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbSet(key, val) {
  try {
    const db = await idbOpen();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    return new Promise(r => { tx.oncomplete = () => r(); });
  } catch (e) {
    console.warn('idbSet error:', e);
  }
}

async function idbGet(key) {
  try {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const r = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    return null;
  }
}

function normalizeUserData(raw) {
  const d = raw ? { ...raw } : {};
  d.scripts = d.scripts || [];
  d.brokers = d.brokers || [];
  d.scriptEntries = d.scriptEntries || [];
  d.spotEntries = d.spotEntries || [];
  d.cryptoEntries = d.cryptoEntries || [];
  d.nseEntries = d.nseEntries || [];
  d.usStocksEntries = d.usStocksEntries || [];
  d.mutualFund = d.mutualFund || [];
  d.metals = d.metals || [];
  d.ledger = d.ledger || [];
  d.ledgerCrypto = d.ledgerCrypto || [];
  d.ledgerNse = d.ledgerNse || [];
  d.ledgerMF = d.ledgerMF || [];
  d.ledgerMetals = d.ledgerMetals || [];
  d.ledgerUsStocks = d.ledgerUsStocks || [];
  d.ledgerBanks = d.ledgerBanks || [];
  d.ledgerBanksCrypto = d.ledgerBanksCrypto || [];
  d.ledgerBanksNse = d.ledgerBanksNse || [];
  d.ledgerBanksMF = d.ledgerBanksMF || [];
  d.ledgerBanksMetals = d.ledgerBanksMetals || [];
  d.ledgerBanksUsStocks = d.ledgerBanksUsStocks || [];
  d.savedCryptoScripts = d.savedCryptoScripts || [];
  d.savedNseScripts = d.savedNseScripts || [];
  d.savedUsStocksScripts = d.savedUsStocksScripts || [];
  d.savedCryptoBrokers = d.savedCryptoBrokers || [];
  d.savedNseBrokers = d.savedNseBrokers || [];
  d.savedUsStocksBrokers = d.savedUsStocksBrokers || [];
  d.brokerBankMap = d.brokerBankMap || {};
  d.mfFunds = d.mfFunds || [];
  d.mfBrokers = d.mfBrokers || [];
  d.mfFolios = d.mfFolios || [];
  d.metalBrokers = d.metalBrokers || [];

  // Migration for target plans
  if (!d.targetPlanCrypto || !d.targetPlanCrypto.length) {
    d.targetPlanCrypto = (d.targetPlan && d.targetPlan.length)
      ? JSON.parse(JSON.stringify(d.targetPlan))
      : generateDefaultTargetForMarket('crypto');
  }
  if (!d.targetPlanNse || !d.targetPlanNse.length) d.targetPlanNse = generateDefaultTargetForMarket('nse');
  if (!d.targetPlanMf || !d.targetPlanMf.length) d.targetPlanMf = generateDefaultTargetForMarket('mutualFund');
  if (!d.targetPlanMetals || !d.targetPlanMetals.length) d.targetPlanMetals = generateDefaultTargetForMarket('metals');
  if (!d.targetPlanUsStocks || !d.targetPlanUsStocks.length) d.targetPlanUsStocks = generateDefaultTargetForMarket('usStocks');

  return d;
}

export function AppProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState('cryptoEntry');
  const [folderHandle, setFolderHandle] = useState(null);
  const [folderLinked, setFolderLinked] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'backup', 'invoice', etc.
  const [modalPayload, setModalPayload] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  // Initialize and Seed Users & Data
  useEffect(() => {
    let localUsers = [];
    try {
      localUsers = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
      localUsers = [];
    }

    if (!localUsers || localUsers.length === 0) {
      localUsers = defaultUsersList;
      localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
    }
    setUsers(localUsers);

    // Seed data for default user if missing
    localUsers.forEach(u => {
      const dataKey = 'vemuba_data_' + u.id;
      const existing = localStorage.getItem(dataKey);
      if (!existing && u.email === 'vemuba240723@gmail.com') {
        localStorage.setItem(dataKey, JSON.stringify(defaultDataObj));
      }
    });

    // Resume session
    const sessionId = localStorage.getItem(SESSION_KEY);
    let matchedUser = localUsers.find(u => u.id === sessionId);
    if (!matchedUser && localUsers.length > 0) {
      // Auto-select Suresh Kumar if available
      matchedUser = localUsers.find(u => u.email === 'vemuba240723@gmail.com') || localUsers[0];
      if (matchedUser) {
        localStorage.setItem(SESSION_KEY, matchedUser.id);
      }
    }

    if (matchedUser) {
      setCurrentUser(matchedUser);
      loadUserData(matchedUser.id);
    }

    // Try to restore folder handle
    restoreFolderHandle();
  }, []);

  const loadUserData = (uid) => {
    const dataKey = 'vemuba_data_' + uid;
    let rawData = null;
    try {
      rawData = JSON.parse(localStorage.getItem(dataKey));
    } catch (e) {
      rawData = null;
    }
    if (!rawData && defaultDataObj) {
      rawData = defaultDataObj;
      localStorage.setItem(dataKey, JSON.stringify(defaultDataObj));
    }
    const normalized = normalizeUserData(rawData);
    setData(normalized);
  };

  const restoreFolderHandle = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await idbGet('vemuba_folder');
        if (handle) {
          const perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            setFolderHandle(handle);
            setFolderLinked(true);
          }
        }
      }
    } catch (e) {
      console.warn('Folder handle restore error:', e);
    }
  };

  const linkFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('File System Access API is not supported in this browser. LocalStorage and JSON Backup will be used.');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await idbSet('vemuba_folder', handle);
      setFolderHandle(handle);
      setFolderLinked(true);
      showNotification('Folder linked successfully! Data will auto-save to JSON files in that directory.');
      
      // Save current state to folder
      if (handle) {
        try {
          const fileHandleU = await handle.getFileHandle('vemuba_users.json', { create: true });
          const writableU = await fileHandleU.createWritable();
          await writableU.write(JSON.stringify(users, null, 2));
          await writableU.close();

          if (currentUser && data) {
            const fileHandleD = await handle.getFileHandle(`vemuba_data_${currentUser.id}.json`, { create: true });
            const writableD = await fileHandleD.createWritable();
            await writableD.write(JSON.stringify(data, null, 2));
            await writableD.close();
          }
        } catch (err) {
          console.warn('Writing to linked folder error:', err);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        alert('Could not link folder: ' + e.message);
      }
    }
  };

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const persistData = useCallback(async (updatedData) => {
    if (!currentUser) return;
    const dataKey = 'vemuba_data_' + currentUser.id;
    try {
      localStorage.setItem(dataKey, JSON.stringify(updatedData));
    } catch (e) {
      console.error('localStorage quota exceeded', e);
    }

    if (folderHandle) {
      try {
        const fh = await folderHandle.getFileHandle(`vemuba_data_${currentUser.id}.json`, { create: true });
        const w = await fh.createWritable();
        await w.write(JSON.stringify(updatedData, null, 2));
        await w.close();
      } catch (err) {
        console.warn('Auto-save to folder error:', err);
      }
    }
  }, [currentUser, folderHandle]);

  const updateData = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev || {}) : { ...prev, ...updater };
      const normalized = normalizeUserData(next);
      persistData(normalized);
      return normalized;
    });
  }, [persistData]);

  const doLogin = (identifier, password) => {
    const idf = (identifier || '').trim().toLowerCase();
    const user = users.find(u =>
      (u.email && u.email.toLowerCase() === idf) ||
      (u.phone && u.phone === idf)
    );
    if (!user) return { success: false, message: 'No account found with that email or phone.' };
    if (user.passHash !== simpleHash(password)) {
      return { success: false, message: 'Incorrect password.' };
    }
    localStorage.setItem(SESSION_KEY, user.id);
    setCurrentUser(user);
    loadUserData(user.id);
    return { success: true };
  };

  const doRegister = (name, email, phone, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    if (!name || (!cleanEmail && !cleanPhone) || !password) {
      return { success: false, message: 'Please fill name, an email or phone, and a password.' };
    }
    if (cleanEmail && users.find(u => u.email && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    if (cleanPhone && users.find(u => u.phone && u.phone === cleanPhone)) {
      return { success: false, message: 'An account with this phone already exists.' };
    }

    const newId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newUser = {
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passHash: simpleHash(password)
    };

    const newUsersList = [...users, newUser];
    setUsers(newUsersList);
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsersList));

    const initialData = normalizeUserData(defaultDataObj);
    localStorage.setItem('vemuba_data_' + newId, JSON.stringify(initialData));

    // Save users to folder if linked
    if (folderHandle) {
      folderHandle.getFileHandle('vemuba_users.json', { create: true })
        .then(fh => fh.createWritable())
        .then(w => { w.write(JSON.stringify(newUsersList, null, 2)); return w.close(); })
        .catch(console.warn);
    }

    return { success: true, user: newUser };
  };

  const doLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setData(null);
  };

  const exportBackup = () => {
    if (!data || !currentUser) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vemuba_backup_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Backup downloaded successfully!');
  };

  const importBackup = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
      const normalized = normalizeUserData(parsed);
      setData(normalized);
      persistData(normalized);
      showNotification('Data restored successfully!');
      return { success: true };
    } catch (e) {
      return { success: false, message: 'Failed to parse JSON backup file.' };
    }
  };

  const value = {
    users,
    currentUser,
    data,
    updateData,
    activeView,
    setActiveView,
    folderHandle,
    folderLinked,
    linkFolder,
    doLogin,
    doRegister,
    doLogout,
    exportBackup,
    importBackup,
    activeModal,
    setActiveModal,
    modalPayload,
    setModalPayload,
    statusMsg,
    showNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
