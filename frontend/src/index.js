import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
const enableStrictMode = process.env.REACT_APP_STRICT_MODE !== 'false';
const app = <App />;

root.render(enableStrictMode ? <React.StrictMode>{app}</React.StrictMode> : app);
