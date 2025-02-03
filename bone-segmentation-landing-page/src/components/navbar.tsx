import React from 'react';
import './NavBar.css';

const NavBar: React.FC = () => {
  const handlePhysicianLogin = () => {
    alert('Redirecting to Physician Login...');
  };

  const handlePatientLogin = () => {
    alert('Redirecting to Patient Login...');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">Osteosurface Solutions</div>
      <div className="nav-buttons">
        <button className="nav-button" onClick={handlePhysicianLogin}>
          Login as Physician
        </button>
        <button className="nav-button" onClick={handlePatientLogin}>
          Login as Patient
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
