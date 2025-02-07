
import './App.css';
import FeaturesSection from './components/FeaturesSection';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import NavBar from './components/navbar';

function App() {
  return (
    <div>
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
}

export default App;
