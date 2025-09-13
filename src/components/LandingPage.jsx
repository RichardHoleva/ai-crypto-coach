import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import '../styles/landingpage.css'; 
import MarketCards from '../components/MarketCards';

function LandingPage() {
  const navigate = useNavigate();

  const fullText = 'Explains the Origin of Crypto Currencies';
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (displayed.length < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayed(fullText.slice(0, displayed.length + 1));
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [displayed, fullText]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((v) => !v);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="landing-container">
      <div className="glow-blur glow1"></div>
      <div className="glow-blur glow2"></div>
      <div className="glow-blur glow3"></div>


      <Navbar />

      <div className="landing-content">
        <h1 className="landing-title">
          {displayed}
          <span className="cursor">{showCursor ? '|' : ' '}</span>
        </h1>
        <span className="landing-subtitle">
          Analyze any contract address and uncover what’s behind the pump
          </span>
        <div className='landing-buttons'>
        <button
          className="get-started-btn"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => navigate('/chat')}
        >
          Start Chatting
        </button>
                <button
          className="get-extension-btn"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => navigate('/chat')}
        >
          Get Extension
        </button>
        </div>
      </div>
      <MarketCards />
    </div>
  );
}

export default LandingPage;
