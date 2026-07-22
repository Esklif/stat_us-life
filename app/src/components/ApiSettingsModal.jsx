import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Settings, X } from 'lucide-react';

export default function ApiSettingsModal({ onClose }) {
  const { apiSettings, setApiSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(apiSettings);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckAndSave = async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`${localSettings.url}/models`, {
        headers: {
          'Authorization': `Bearer ${localSettings.key}`
        }
      });
      if (response.ok) {
        setApiSettings(localSettings);
        onClose();
      } else {
        setError("Ошибка подключения: " + response.statusText);
      }
    } catch (err) {
      setError("Сетевая ошибка: " + err.message);
      // Если это просто CORS или локальный сервер без /models, всё равно сохраним, но предупредим
      if (confirm("Не удалось проверить подключение. Сохранить настройки всё равно?")) {
        setApiSettings(localSettings);
        onClose();
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2">
            <Settings size={24} className="text-blue-500" />
            Настройки API
          </h2>
          {apiSettings.key && (
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">URL API (OpenAI-compatible)</label>
          <input
            type="text"
            name="url"
            value={localSettings.url}
            onChange={handleChange}
            className="input-field"
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div className="input-group">
          <label className="input-label">API Key</label>
          <input
            type="password"
            name="key"
            value={localSettings.key}
            onChange={handleChange}
            className="input-field"
            placeholder="sk-..."
          />
        </div>

        <div className="input-group">
          <label className="input-label">Модель (напр. gpt-4o-mini)</label>
          <input
            className="input-field"
            name="model"
            value={localSettings.model}
            onChange={handleChange}
            placeholder="gpt-3.5-turbo"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Лимит токенов контекста</label>
          <input
            className="input-field"
            type="number"
            name="maxTokens"
            value={localSettings.maxTokens || 4000}
            onChange={handleChange}
            placeholder="4000"
          />
        </div>

        <div className="input-group flex-1">
          <label className="input-label">System Prompt</label>
          <textarea
            name="systemPrompt"
            value={localSettings.systemPrompt}
            onChange={handleChange}
            className="input-field"
            rows="4"
          />
        </div>

        {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}

        <button
          onClick={handleCheckAndSave}
          className="btn btn-primary w-full mt-4"
          disabled={checking}
        >
          {checking ? "Проверка..." : "Сохранить и продолжить"}
        </button>
      </div>
    </div>
  );
}
