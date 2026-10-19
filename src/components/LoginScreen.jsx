import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import logoImg from '../assets/logo.png';
import brandNameImg from '../assets/brand-name.png';
import { Lock, Mail, Phone, User as UserIcon, LogIn, UserPlus } from 'lucide-react';

export default function LoginScreen() {
  const { doLogin, doRegister, users } = useApp();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  
  // Login form state
  const [loginId, setLoginId] = useState('vemuba240723@gmail.com');
  const [loginPass, setLoginPass] = useState('');
  const [loginMsg, setLoginMsg] = useState({ text: '', type: '' });

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regMsg, setRegMsg] = useState({ text: '', type: '' });

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginId) {
      setLoginMsg({ text: 'Please enter your email or phone number.', type: 'err' });
      return;
    }
    const res = doLogin(loginId, loginPass);
    if (!res.success) {
      setLoginMsg({ text: res.message, type: 'err' });
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (regPass !== regPass2) {
      setRegMsg({ text: 'Passwords do not match.', type: 'err' });
      return;
    }
    const res = doRegister(regName, regEmail, regPhone, regPass);
    if (!res.success) {
      setRegMsg({ text: res.message, type: 'err' });
    } else {
      setRegMsg({ text: 'Account created successfully! Please log in.', type: 'ok' });
      setTimeout(() => {
        setTab('login');
        setLoginId(regEmail || regPhone);
        setLoginPass('');
      }, 800);
    }
  };

  return (
    <div className="loginScreenContainer">
      <div className="loginCard">
        <div className="loginLogoRow">
          <img className="logoImg" src={logoImg} alt="VEMUBA Logo" />
          <img className="nameImg" src={brandNameImg} alt="VEMUBA ENTERPRISES" />
          <div className="loginTagline">PORTFOLIO TRACKER & FINANCE MANAGEMENT</div>
        </div>

        <div className="authTabs">
          <div
            className={`authTab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setLoginMsg({ text: '', type: '' }); }}
          >
            Sign In
          </div>
          <div
            className={`authTab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setRegMsg({ text: '', type: '' }); }}
          >
            Create Account
          </div>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="field">
              <label>Email or Phone Number</label>
              <div className="inputWithIcon">
                <Mail size={16} className="fieldIcon" />
                <input
                  type="text"
                  placeholder="vemuba240723@gmail.com or 7358472700"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="inputWithIcon">
                <Lock size={16} className="fieldIcon" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
              </div>
            </div>

            {users && users.length > 0 && (
              <div className="savedUsersHint">
                <span className="hintLabel">Saved Accounts:</span>
                <div className="userChipsRow">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="userChipBtn"
                      onClick={() => setLoginId(u.email || u.phone)}
                    >
                      {u.name} ({u.email || u.phone})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="btnPrimary">
              <LogIn size={16} style={{ marginRight: 6 }} />
              Sign In to Vemuba
            </button>

            {loginMsg.text && (
              <div className={`authMsg ${loginMsg.type}`}>{loginMsg.text}</div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div className="field">
              <label>Full Name</label>
              <div className="inputWithIcon">
                <UserIcon size={16} className="fieldIcon" />
                <input
                  type="text"
                  placeholder="e.g. Suresh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Email Address</label>
              <div className="inputWithIcon">
                <Mail size={16} className="fieldIcon" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Phone Number</label>
              <div className="inputWithIcon">
                <Phone size={16} className="fieldIcon" />
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="inputWithIcon">
                <Lock size={16} className="fieldIcon" />
                <input
                  type="password"
                  placeholder="At least 4 characters"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Confirm Password</label>
              <div className="inputWithIcon">
                <Lock size={16} className="fieldIcon" />
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={regPass2}
                  onChange={(e) => setRegPass2(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btnPrimary">
              <UserPlus size={16} style={{ marginRight: 6 }} />
              Create Account
            </button>

            {regMsg.text && (
              <div className={`authMsg ${regMsg.type}`}>{regMsg.text}</div>
            )}
          </form>
        )}

        <div className="loginHint">
          All data is securely saved in this browser and local files. Link a folder after login to auto-sync JSON data alongside your files.
        </div>
      </div>
    </div>
  );
}
