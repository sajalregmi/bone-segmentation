import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import Footer from './components/Footer';
import PhysiciansHome from './pages/PhysiciansHome'; // new page for physicians
import NavBar from './components/navbar';
import ThreeDViewer from './pages/ThreeDViewer';

function App() {
  return (
    <Router>
      <div>
        <NavBar />
        <Routes>
          <Route path="/" element={
            <>
              <HeroSection />
              <FeaturesSection />
            </>
          } />
          <Route path="/physicians/home" element={<PhysiciansHome />} />
          {/* <Route path="/patients/home" element={<PatientsHome />} /> */}
          <Route path="/view-3d/:segmentationId" element={<ThreeDViewer />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
