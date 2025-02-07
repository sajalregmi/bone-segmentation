import React from 'react';
import './HeroSection.css';
import heroImage from '../assets/bone-hero.gif';

const HeroSection: React.FC = () => {
  const handleTryNow = () => {
    alert('Starting bone segmentation demo...');
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1>Advanced Bone Segmentation</h1>
        <p>
          Easily segment and reconstruct 3D models of bones, directly from your browser.
        </p>
        <button className="hero-button" onClick={handleTryNow}>
          Try Now
        </button>
      </div>
      <div className="hero-image-container">
        <img src={heroImage} alt="Bone Segmentation" className="hero-image" />
      </div>
    </section>
  );
};

export default HeroSection;
