import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import LandingPage from './components/LandingPage.jsx';
import './index.css';

const NotFound = () => <div>404 - Page Not Found</div>;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/ai-crypto-coach">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<App />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);