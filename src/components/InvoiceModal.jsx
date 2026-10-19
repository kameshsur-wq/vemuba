import React from 'react';
import { useApp } from '../context/AppContext';
import { X, FileText } from 'lucide-react';

export default function InvoiceModal() {
  const { activeModal, setActiveModal, modalPayload } = useApp();

  if (activeModal !== 'invoice') return null;

  return (
    <div className="modalOverlay active" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
      <div className="modalBox" style={{ maxWidth: 650 }}>
        <button className="closeX" onClick={() => setActiveModal(null)} title="Close">
          <X size={20} />
        </button>

        <h3 className="modalTitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#1f4d1f" />
          <span>Invoice Attachment</span>
        </h3>

        <div className="modalContent" style={{ marginTop: 16, textAlign: 'center' }}>
          {modalPayload?.type === 'image' || (typeof modalPayload === 'string' && modalPayload.startsWith('data:image')) ? (
            <img
              src={modalPayload?.src || modalPayload}
              alt="Invoice Attachment"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, border: '1px solid #d9e3d3' }}
            />
          ) : modalPayload?.type === 'pdf' ? (
            <iframe
              src={modalPayload.src}
              title="Invoice PDF"
              style={{ width: '100%', height: '60vh', border: 'none' }}
            />
          ) : (
            <div style={{ padding: 24, color: '#64748b' }}>
              <p>No preview available for this attachment.</p>
              {modalPayload && typeof modalPayload === 'string' && (
                <a href={modalPayload} download="attachment" className="btn secondary small">
                  Download Attachment
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
