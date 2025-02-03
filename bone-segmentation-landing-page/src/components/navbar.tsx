import React from 'react';
import './NavBar.css';

const NavBar: React.FC = () => {
  const handlePhysicianLogin = () => {
    // Implementation or route to Physician login page
    alert('Redirecting to Physician Login...');
  };

  const handlePatientLogin = () => {
    // Implementation or route to Patient login page
    alert('Redirecting to Patient Login...');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">BoneSeg</div>
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
