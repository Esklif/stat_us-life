import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TitlePage from './pages/TitlePage';
import WorldFeed from './pages/WorldFeed';
import CreateWorld from './pages/CreateWorld';
import ApiSettingsModal from './components/ApiSettingsModal';
import useStore from './store/useStore';

function App() {
  const { isFirstLogin, apiSettings } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isFirstLogin || !apiSettings.key) {
      setShowSettings(true);
    }
  }, [isFirstLogin, apiSettings.key]);

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
