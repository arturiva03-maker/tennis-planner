import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import WeddingRegistrationWrapper from './WeddingRegistrationWrapper';
import BritzRegistrationWrapper from './BritzRegistrationWrapper';
import SepaForm from './SepaForm';
import AGBPage from './AGBPage';
import AGBPageBritz from './AGBPageBritz';
import WeddingPage from './WeddingPage';
import BritzPage from './BritzPage';
import TenniscampForm from './TenniscampForm';
import TenniscampInfoPage from './TenniscampInfoPage';
import AbsagePage from './AbsagePage';
import KennlerntennisForm from './KennlerntennisForm';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/anmeldung-wedding" element={<WeddingRegistrationWrapper />} />
        <Route path="/anmeldung-britz" element={<BritzRegistrationWrapper />} />
        <Route path="/sepa" element={<SepaForm />} />
        <Route path="/sepa-britz" element={<SepaForm anlage="Britz" />} />
        <Route path="/agb" element={<AGBPage />} />
        <Route path="/agb-britz" element={<AGBPageBritz />} />
        <Route path="/wedding" element={<WeddingPage />} />
        <Route path="/wedding-sommertraining" element={<WeddingPage autoScrollSommertraining />} />
        <Route path="/britz" element={<BritzPage />} />
        <Route path="/tenniscamp" element={<TenniscampForm />} />
        <Route path="/tenniscamp-info" element={<TenniscampInfoPage />} />
        <Route path="/kennlerntennis" element={<KennlerntennisForm />} />
        <Route path="/absage/:id" element={<AbsagePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
