// src/components/MarketCards.jsx
import { useEffect, useState } from 'react';
import '../styles/marketcards.css';
import btcIcon from '../assets/coin_info_btcc.png';
import ethIcon from '../assets/coin_info_eth.png';
import solIcon from '../assets/coin_info_sol.png';

function MarketCards() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((res) => {
        const coins = [
          {
            name: 'Bitcoin',
            symbol: 'BTC',
            price: `$${res.bitcoin.usd.toLocaleString()}`,
            change: res.bitcoin.usd_24h_change.toFixed(2),
            link: 'https://coinmarketcap.com/currencies/bitcoin/',
          },
          {
            name: 'Ethereum',
            symbol: 'ETH',
            price: `$${res.ethereum.usd.toLocaleString()}`,
            change: res.ethereum.usd_24h_change.toFixed(2),
            link: 'https://coinmarketcap.com/currencies/ethereum/',
          },
          {
            name: 'Solana',
            symbol: 'SOL',
            price: `$${res.solana.usd.toLocaleString()}`,
            change: res.solana.usd_24h_change.toFixed(2),
            link: 'https://coinmarketcap.com/currencies/solana/',
          },
        ];
        setData(coins);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching crypto data:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="market-card-container">Loading crypto data...</div>;
  }

  if (error) {
    return <div className="market-card-container">Error: {error}</div>;
  }

  return (
    <div className="market-card-container">
      {data.map((coin) => (
        <a
          key={coin.symbol}
          href={coin.link}
          className="market-card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="market-card-header">
            <span className="coin-symbol">
              {coin.symbol === 'BTC' ? (
                <img src={btcIcon} alt="Bitcoin" className="coin-image" />
              ) : coin.symbol === 'SOL' ? (
                <img src={solIcon} alt="Solana" className="coin-image" />
              ) : coin.symbol === 'ETH' ? (
                <img src={ethIcon} alt="Ethereum" className="coin-image" />
              ) : (
                coin.name
              )}
            </span>
            
            <span
              className={`coin-change ${
                parseFloat(coin.change) >= 0 ? 'positive' : 'negative'
              }`}
            >
              {parseFloat(coin.change) >= 0 ? '+' : ''}
              {coin.change}%
            </span>
          </div>
          <div className="coin-price">{coin.price}</div>
        </a>
      ))}
    </div>
  );
}

export default MarketCards;