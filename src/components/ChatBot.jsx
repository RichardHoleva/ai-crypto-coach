import { useState, useRef, useEffect } from 'react';
import coachPng from '../assets/coach.png';
import '../styles/chatbot.css';

function ChatBot() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  
  const messagesRef = useRef(null);

  const suggestions = [
    { icon: '🔥', text: "What's trending in crypto right now?" },
    { icon: '👑', text: "What's the most popular meme coin rn?" },
    { icon: '🐂', text: 'Is market bullish or bearish today?' },
    { icon: '💲', text: 'What is the current market cap of bitcoin?' },
  ];


  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (message) => {
  const trimmed = (message || '').trim();
  if (!trimmed || loading) return;

  setLoading(true);
  setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
  setInput('');

  try {
    const res = await fetch('http://localhost:3000/api/chat', {   // 👈 fixed URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed })
    });

    let data = null;
    try { 
      data = await res.json(); 
    } catch (_) {}

    setMessages(prev => [
      ...prev,
      { sender: 'bot', text: data?.reply ?? 'No reply' }
    ]);
  } catch (e) {
    console.error(e);
    setMessages(prev => [
      ...prev,
      { sender: 'bot', text: 'Oops! Something went wrong.' }
    ]);
  } finally {
    setLoading(false);
  }
};

  const handleSend = () => sendMessage(input);

  return (
    <div className="coach-page">
      <div className="coach-container">
        {/* background glows */}
        <div className="glow-blur glow1" />
        <div className="glow-blur glow2" />
        <div className="glow-blur glow3" />

        {messages.length === 0 ? (
          <div className="hero">
            <h1 className="hero-title">ASK SOMETHING TO AI COACH!</h1>
            <p className="hero-sub">
              Start by writing your questions about crypto or choose between the suggested prompts
            </p>

            <div className="prompt-grid">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="prompt-pill"
                  onClick={() => sendMessage(s.text)}
                  disabled={loading}
                >
                  <span className="pill-icon" aria-hidden>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="messages"
            role="log"
            aria-live="polite"
            ref={messagesRef} /* only this area scrolls */
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={'msg ' + (m.sender === 'user' ? 'user' : 'bot')}
              >
                <div className="bubble">{m.text}</div>
              </div>
            ))}

            {loading && (
              <div className="msg bot">
                <div className="bubble typing" aria-label="Assistant is typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="composer">
          <img src={coachPng} alt="Coach" className="coach-avatar" />
          <input
            className="input"
            placeholder="ASK SOMETHING..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label="Message input"
          />
          <button
            className="send"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatBot;
