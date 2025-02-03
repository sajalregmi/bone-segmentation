import React, { useState } from 'react';
import './NavBar.css';

const NavBar: React.FC = () => {
  const [showPhysicianModal, setShowPhysicianModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [physicianEmail, setPhysicianEmail] = useState('');
  const [physicianPassword, setPhysicianPassword] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const handlePhysicianLoginClick = () => {
    setShowPhysicianModal(true);
  };
  const closePhysicianModal = () => {
    setShowPhysicianModal(false);
  };
  const handlePhysicianLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert(`Physician Login:\nEmail: ${physicianEmail}\nPassword: ${physicianPassword}`);
    setShowPhysicianModal(false);
  };

  const handlePatientLoginClick = () => {
    setShowPatientModal(true);
  };
  const closePatientModal = () => {
    setShowPatientModal(false);
  };
  const handlePatientLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert(`Patient Login:\nEmail: ${patientEmail}\nPassword: ${patientPassword}`);
    setShowPatientModal(false);
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
        </div>
      </nav>

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
    </>
  );
};

export default NavBar;
