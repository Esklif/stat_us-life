import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function CreateWorld() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { worlds, addWorld, updateWorldData } = useStore();
  const editWorld = editId ? worlds.find(w => w.id === editId) : null;

  const [name, setName] = useState(editWorld ? editWorld.name : '');
  const [description, setDescription] = useState(editWorld ? editWorld.description : '');
  const [avatar, setAvatar] = useState(editWorld ? editWorld.avatar : null);
  const fileInputRef = useRef(null);
  
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
    if (editId) {
      updateWorldData(editId, w => ({ ...w, name, description, avatar }));
    } else {
      addWorld({
        name,
        description,
        avatar,
        createdAt: new Date().toISOString()
      });
    }
    navigate('/');
  };

  return (
    <div className="p-4 flex-col min-h-screen">
      <header className="modal-header">
        <button onClick={() => navigate('/')} className="btn-icon btn-ghost">
          <ArrowLeft size={24} />
        </button>
        <h2 className="modal-title">{editId ? 'Редактировать мир' : 'Создать мир'}</h2>
      </header>

      <div className="flex-col gap-6">
        <div className="flex justify-center mb-2">
          <div
            className="empty-state-icon"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: avatar ? `url(${avatar}) center/cover` : 'var(--surface-color)',
              border: '2px dashed var(--border-color)',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {!avatar && <ImageIcon size={32} color="var(--text-secondary)" />}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            hidden
          />
        </div>
        <p className="empty-state-text" style={{ textAlign: 'center', marginTop: '-15px', color: 'var(--text-secondary)' }}>
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
          {editId ? 'Сохранить изменения' : 'Продолжить'}
        </button>
      </div>
    </div>
  );
}
