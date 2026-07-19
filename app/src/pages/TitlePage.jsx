import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Settings, Plus, Globe, Trash } from 'lucide-react';

export default function TitlePage({ onOpenSettings }) {
  const { worlds, setActiveWorldId, deleteWorld } = useStore();
  const navigate = useNavigate();

  const handleDeleteWorld = (id) => {
    if (window.confirm('Точно удалить этот мир? Это навсегда.')) {
      deleteWorld(id);
    }
  };

  const handleOpenWorld = (id) => {
    setActiveWorldId(id);
    navigate(`/world/${id}`);
  };

  return (
    <div className="p-4 flex-col min-h-screen">
      <header className="flex justify-between items-center mb-6 pt-2">
        <h1 className="flex items-center gap-2" style={{ fontSize: '2rem' }}>
          status<span style={{ color: 'var(--accent-color)' }}>.</span>
        </h1>
        <button onClick={onOpenSettings} className="btn-icon">
          <Settings size={22} />
        </button>
      </header>

      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Ваши миры</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/create-world')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          <Plus size={18} style={{ marginRight: '0.25rem' }} /> Создать
        </button>
      </div>

      <div className="flex-col gap-4">
        {worlds.length === 0 ? (
          <div className="text-center p-6 card" style={{ borderColor: 'transparent', backgroundColor: 'var(--surface-color-hover)' }}>
            <Globe size={48} className="mb-4 mx-auto" style={{ color: 'var(--text-secondary)' }} />
            <p>У вас пока нет созданных миров. Нажмите "Создать", чтобы начать.</p>
          </div>
        ) : (
          worlds.map(world => (
            <div 
              key={world.id} 
              className="card cursor-pointer"
              onClick={() => handleOpenWorld(world.id)}
              style={{ padding: '0', position: 'relative' }}
            >
              {world.avatar ? (
                <div style={{ height: '120px', backgroundImage: `url(${world.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ) : (
                <div style={{ height: '120px', background: 'linear-gradient(45deg, var(--surface-color), var(--accent-color-hover))' }} />
              )}
              <div className="p-4">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{world.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {world.description}
                </p>
                <div className="flex items-center gap-4 mt-3" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>День {world.day || 1}</span>
                  <span>{world.posts?.length || 0} постов</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteWorld(world.id); }}
                  style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
