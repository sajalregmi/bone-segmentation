import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // for navigating programmatically
import './NavBar.css';

const NavBar = () => {
  const navigate = useNavigate();

  // Physician Login States
  const [showPhysicianModal, setShowPhysicianModal] = useState(false);
  const [physicianEmail, setPhysicianEmail] = useState('');
  const [physicianPassword, setPhysicianPassword] = useState('');

  // Patient Login States
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');

  // Signup States
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('physician'); // default or 'patient'

  // ---------------------
  // HANDLERS: PHYSICIAN LOGIN
  // ---------------------
  const handlePhysicianLoginClick = () => {
    setShowPhysicianModal(true);
  };
  const closePhysicianModal = () => {
    setShowPhysicianModal(false);
  };
  const handlePhysicianLoginSubmit = (e: any) => {
    e.preventDefault();

    // SAMPLE login fetch
    fetch('http://127.0.0.1:8000/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: physicianEmail,
        password: physicianPassword
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Physician login failed');
        }
        return res.json();
      })
      .then((data) => {
        localStorage.setItem('access_token', data.access_token);
        setShowPhysicianModal(false);
          navigate('/physicians/home');
      })
      .catch((err) => {
        console.error(err);
        alert('Login failed!');
      });
  };

  // ---------------------
  // HANDLERS: PATIENT LOGIN
  // ---------------------
  const handlePatientLoginClick = () => {
    setShowPatientModal(true);
  };
  const closePatientModal = () => {
    setShowPatientModal(false);
  };
  const handlePatientLoginSubmit = (e: any) => {
    e.preventDefault();

    // SAMPLE login fetch
    fetch('http://127.0.0.1:8000/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: patientEmail,
        password: patientPassword
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Patient login failed');
        }
        return res.json();
      })
      .then((data) => {
        alert(`Logged in as patient: ${patientEmail}`);
        setShowPatientModal(false);
         // navigate('/physicians/home');

      })
      .catch((err) => {
        console.error(err);
        alert('Login failed!');
      });
  };

  // ---------------------
  // HANDLERS: SIGNUP
  // ---------------------
  const handleSignupClick = () => {
    setShowSignupModal(true);
  };
  const closeSignupModal = () => {
    setShowSignupModal(false);
  };
  const handleSignupSubmit = (e: any) => {
    e.preventDefault();

    // SAMPLE signup fetch
    fetch('http://127.0.0.1:8000/signup/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: signupEmail,
        password: signupPassword,
        role: signupRole
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Signup failed');
        }
        return res.json();
      })
      .then((data: any) => {
        alert('Signup successful, please login to continue');
        setShowSignupModal(false);
      })
      .catch((err) => {
        console.error(err);
        alert('Signup failed!');
      });
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">Osteosurface Solutions</div>
        <div className="nav-buttons">
          <button className="nav-button" onClick={handlePhysicianLoginClick}>
            Login as Physician
          </button>
          <button className="nav-button" onClick={handlePatientLoginClick}>
            Login as Patient
          </button>
          <button className="nav-button" onClick={handleSignupClick}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* Physician Login Modal */}
      {showPhysicianModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-button" onClick={closePhysicianModal}>
              &times;
            </button>
            <h2>Physician Login</h2>
            <form onSubmit={handlePhysicianLoginSubmit}>
              <div className="form-group">
                <label htmlFor="physicianEmail">Email</label>
                <input
                  id="physicianEmail"
                  type="email"
                  value={physicianEmail}
                  onChange={(e) => setPhysicianEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="physicianPassword">Password</label>
                <input
                  id="physicianPassword"
                  type="password"
                  value={physicianPassword}
                  onChange={(e) => setPhysicianPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Login
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Patient Login Modal */}
      {showPatientModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-button" onClick={closePatientModal}>
              &times;
            </button>
            <h2>Patient Login</h2>
            <form onSubmit={handlePatientLoginSubmit}>
              <div className="form-group">
                <label htmlFor="patientEmail">Email</label>
                <input
                  id="patientEmail"
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="patientPassword">Password</label>
                <input
                  id="patientPassword"
                  type="password"
                  value={patientPassword}
                  onChange={(e) => setPatientPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Login
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-button" onClick={closeSignupModal}>
              &times;
            </button>
            <h2>Sign Up</h2>
            <form onSubmit={handleSignupSubmit}>
              <div className="form-group">
                <label htmlFor="signupEmail">Email</label>
                <input
                  id="signupEmail"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signupPassword">Password</label>
                <input
                  id="signupPassword"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signupRole">Role</label>
                <select
                  id="signupRole"
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                >
                  <option value="physician">Physician</option>
                  <option value="patient">Patient</option>
                </select>
              </div>

              <button type="submit" className="submit-button">
                Sign Up
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
