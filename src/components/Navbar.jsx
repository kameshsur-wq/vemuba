import React from 'react';
import { useApp } from '../context/AppContext';
import logoImg from '../assets/logo.png';
import brandNameImg from '../assets/brand-name.png';
import { FolderCheck, FolderSync, Database, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { currentUser, doLogout, folderLinked, linkFolder, setActiveModal } = useApp();

  return (
    <header className="topbar">
      <div className="brandRow">
        <img className="logoImg" src={logoImg} alt="VEMUBA Logo" />
        <img className="nameImg" src={brandNameImg} alt="VEMUBA ENTERPRISES" />
      </div>

      <div className="userRow">
        <button
          className={`btnGhost linkFolderBtn ${folderLinked ? 'active' : ''}`}
          onClick={linkFolder}
          title={folderLinked ? 'Folder linked: Auto-saving to local directory' : 'Click to link folder for auto-saving JSON files'}
        >
          {folderLinked ? <FolderCheck size={16} color="#1b7a3d" /> : <FolderSync size={16} />}
          <span>{folderLinked ? 'Folder Linked' : 'Link Folder'}</span>
        </button>

        <button
          className="btnGhost"
          onClick={() => setActiveModal('backup')}
          title="Backup & Restore Data"
        >
          <Database size={15} />
          <span>Backup</span>
        </button>

        <div className="userChip">
          <User size={14} style={{ marginRight: 6 }} />
          <span>{currentUser?.name || currentUser?.email || currentUser?.phone || 'User'}</span>
        </div>

        <button className="btnGhost logoutBtn" onClick={doLogout} title="Log Out">
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
