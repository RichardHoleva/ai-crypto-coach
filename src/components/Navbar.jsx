import { Link } from 'react-router-dom';
import { useState } from 'react';
import '../styles/navbar.css'; 

function Navbar() {
  const [showNotification, setShowNotification] = useState(false);

  const handleExtensionClick = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 1500);
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className='crypto-highlight'>Crypto</span>Coach
      </div>

      <div className="navbar-links">
        <a href="/ai-crypto-coach/">Home</a>
        <Link to="/chat">ChatBot</Link>
        <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer">DexScreener</a>
        <a href="https://coinmarketcap.com" target="_blank" rel="noopener noreferrer">Market</a>
        <div className="extension-button-container">
          <button className="navbar-button" onClick={handleExtensionClick}>
            Get Extension
          </button>
          {showNotification && (
            <div className="coming-soon-notification">
              Coming Soon! 🚀
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;