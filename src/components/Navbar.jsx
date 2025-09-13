import { Link } from 'react-router-dom';
import '../styles/navbar.css'; 

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className='crypto-highlight'>Crypto</span>Coach
      </div>

      <div className="navbar-links">
        <a href="/">Home</a>
        <Link to="/chat">ChatBot</Link>
        <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer">DexScreener</a>
        <a href="https://coinmarketcap.com" target="_blank" rel="noopener noreferrer">Market</a>
        <button className="navbar-button">Get Extension</button>
      </div>
    </nav>
  );
}

export default Navbar;