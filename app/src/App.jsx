import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TitlePage from './pages/TitlePage';
import WorldFeed from './pages/WorldFeed';
import CreateWorld from './pages/CreateWorld';
import ApiSettingsModal from './components/ApiSettingsModal';
import useStore, { useBackStore } from './store/useStore';
import { App as CapacitorApp } from '@capacitor/app';

function App() {
  const { isFirstLogin, apiSettings, theme } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
  }, [theme]);

  useEffect(() => {
    if (isFirstLogin || !apiSettings.key) {
      setShowSettings(true);
    }
  }, [isFirstLogin, apiSettings.key]);

  useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const handlers = useBackStore.getState().handlers;
      if (handlers.length > 0) {
        handlers[handlers.length - 1].fn();
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => listener.remove();
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<TitlePage onOpenSettings={() => setShowSettings(true)} />} />
          <Route path="/create-world" element={<CreateWorld />} />
          <Route path="/world/:id" element={<WorldFeed />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        
        {showSettings && (
          <ApiSettingsModal onClose={() => {
            if (apiSettings.key) {
              setShowSettings(false);
              useStore.getState().setIsFirstLogin(false);
            } else {
              alert("Пожалуйста, введите API ключ для продолжения.");
            }
          }} />
        )}
      </div>
    </Router>
  );
}

export default App;
