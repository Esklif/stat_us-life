import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function CreateWorld() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = useRef(null);
  
  const { addWorld } = useStore();
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !description.trim()) return;
    addWorld({
      name,
      description,
      avatar,
      createdAt: new Date().toISOString()
    });
    navigate('/');
  };

  return (
    <div className="p-4 flex-col min-h-screen">
      <header className="flex items-center gap-4 mb-6 pt-2">
        <button onClick={() => navigate('/')} className="btn-icon" style={{ background: 'transparent' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.25rem' }}>Создать мир</h2>
      </header>

      <div className="flex-col gap-6">
        <div className="flex justify-center mb-2">
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: avatar ? `url(${avatar}) center/cover` : 'var(--surface-color)',
              border: '2px dashed var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden'
            }}
          >
            {!avatar && <ImageIcon size={32} color="var(--text-secondary)" />}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            style={{ display: 'none' }} 
          />
        </div>
        <p className="text-center" style={{ marginTop: '-1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Добавить обложку (опционально)
        </p>

        <div className="input-group">
          <label className="input-label">Название мира</label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Jujutsu Kaisen"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Описание и сеттинг</label>
          <textarea
            className="input-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите мир, ключевых персонажей и правила..."
            rows="5"
          />
        </div>

        <button 
          className="btn btn-primary w-full mt-4" 
          onClick={handleCreate}
          disabled={!name.trim() || !description.trim()}
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
