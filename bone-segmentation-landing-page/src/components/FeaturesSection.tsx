import React from 'react';
import './FeaturesSection.css';

const FeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'View and Segment CT on the Web',
      description: 'Access CT scanning data from any browser. No software installation required.'
    },
    {
      title: 'Generate 3D Models',
      description: 'Create detailed and accurate 3D reconstructions of bone structures.'
    },
    {
      title: 'Fast Processing',
      description: 'Enjoy processing times of less than 5 seconds per scan.'
    },
    {
      title: 'High Resolution, No Special Hardware',
      description: 'Get high-quality images on any standard device.'
    }
  ];

  return (
    <section className="features-section">
      <h2>Key Features</h2>
      <div className="features-list">
        {features.map((feature, index) => (
          <div className="feature-item" key={index}>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
