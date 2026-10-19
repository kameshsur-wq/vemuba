import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Upload, X, ShieldAlert } from 'lucide-react';

export default function BackupModal() {
  const { activeModal, setActiveModal, exportBackup, importBackup } = useApp();
  const [msg, setMsg] = useState({ text: '', type: '' });

  if (activeModal !== 'backup') return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const res = importBackup(content);
        if (res.success) {
          setMsg({ text: 'Data restored successfully!', type: 'ok' });
        } else {
          setMsg({ text: res.message || 'Error restoring data', type: 'err' });
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modalOverlay active" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
      <div className="modalBox">
        <button className="closeX" onClick={() => setActiveModal(null)} title="Close">
          <X size={20} />
        </button>

        <h3 className="modalTitle">Backup / Restore Your Data</h3>
        <p className="modalDesc">
          Your data is stored locally on this device. Export a backup JSON file regularly, or restore from one to sync across devices.
        </p>

        <div className="backupActions">
          <button className="btn" onClick={exportBackup} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} />
            Download Backup (JSON)
          </button>

          <div className="restoreSection">
            <label className="restoreLabel">Restore from Backup File</label>
            <div className="fileInputWrapper">
              <input type="file" accept="application/json" onChange={handleFileChange} />
            </div>
          </div>
        </div>

        {msg.text && (
          <div className={`authMsg ${msg.type}`} style={{ marginTop: 14 }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
