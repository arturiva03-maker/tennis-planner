import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import RegistrationForm from './RegistrationForm';
import SepaForm from './SepaForm';
import AGBPage from './AGBPage';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/anmeldung" element={<RegistrationForm anlage="Wedding" />} />
        <Route path="/anmeldung-wedding" element={<RegistrationForm anlage="Wedding" />} />
        <Route path="/anmeldung-britz" element={<RegistrationForm anlage="Britz" />} />
        <Route path="/sepa" element={<SepaForm />} />
        <Route path="/agb" element={<AGBPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
