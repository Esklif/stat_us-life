import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Settings, Plus, Globe, Trash, Upload, Download, Edit2 } from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export default function TitlePage({ onOpenSettings }) {
  const { worlds, setActiveWorldId, deleteWorld, importWorld } = useStore();
  const navigate = useNavigate();
  const importInputRef = useRef(null);

  const handleDeleteWorld = (id) => {
    if (window.confirm('Точно удалить этот мир? Это навсегда.')) {
      deleteWorld(id);
    }
  };

  const handleOpenWorld = (id) => {
    setActiveWorldId(id);
    navigate(`/world/${id}`);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const json = JSON.parse(evt.target.result);
          if (json.name && json.description) {
             importWorld(json);
             alert('Мир успешно импортирован!');
          } else {
             alert('Неверный формат мира. Отсутствуют обязательные поля.');
          }
        } catch (err) {
          alert('Ошибка чтения файла: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleExportWorld = async (world) => {
    const dataStr = JSON.stringify(world, null, 2);
    const exportFileDefaultName = `world_${world.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    
    try {
      await Filesystem.writeFile({
        path: exportFileDefaultName,
        data: dataStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      alert(`Мир сохранен в папку Документы (Documents) на устройстве под именем ${exportFileDefaultName}`);
    } catch (err) {
      console.warn("Capacitor Filesystem fallback to web: ", err);
      // Fallback for web browser testing
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      let linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  return (
    <div className="p-4 flex-col min-h-screen">
      <header className="sticky-header">
        <h1 className="section-title">
          status<span style={{ background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.</span>
        </h1>
        <button onClick={onOpenSettings} className="btn-icon">
          <Settings size={22} />
        </button>
      </header>

      <div className="sticky-header flex justify-between items-center" style={{ marginTop: '1rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Ваши миры</h2>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => importInputRef.current?.click()}
            style={{ padding: '0.5rem 1rem' }}
          >
            <Download size={18} /> Импорт
          </button>
          <input type="file" accept=".json" ref={importInputRef} style={{ display: 'none' }} onChange={handleImportFile} />
          
          <button
            className="btn btn-primary"
            onClick={() => navigate('/create-world')}
            style={{ padding: '0.5rem 1rem' }}
          >
            <Plus size={18} /> Создать
          </button>
        </div>
      </div>

      <div className="flex-col gap-4 mt-4">
        {worlds.length === 0 ? (
          <div className="empty-state">
            <Globe size={48} className="empty-state-icon" />
            <p className="empty-state-title">Нет миров</p>
            <p className="empty-state-text">У вас пока нет созданных миров. Нажмите "Создать", чтобы начать.</p>
          </div>
        ) : (
          worlds.map(world => (
            <div
              key={world.id}
              className="world-card"
              onClick={() => handleOpenWorld(world.id)}
            >
              {world.avatar ? (
                <div className="world-card-cover" style={{ backgroundImage: `url(${world.avatar})` }} />
              ) : (
                <div className="world-card-cover gradient-accent" />
              )}
              <div className="world-card-body">
                <h3 className="world-card-name">{world.name}</h3>
                <p className="world-card-desc">
                  {world.description}
                </p>
                <div className="world-card-meta">
                  <span>Ур. {world.level || 1}</span>
                  <span>День {world.day || 1}</span>
                  <span>{world.posts?.length || 0} постов</span>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.5rem', minWidth: 'auto', height: 'auto', borderRadius: '50%' }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/create-world?edit=${world.id}`); }}
                    title="Редактировать"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.5rem', minWidth: 'auto', height: 'auto', borderRadius: '50%' }}
                    onClick={(e) => { e.stopPropagation(); handleExportWorld(world); }}
                    title="Экспорт"
                  >
                    <Upload size={16} />
                  </button>
                  <button
                    className="world-card-delete"
                    style={{ position: 'relative', top: 0, right: 0 }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteWorld(world.id); }}
                    title="Удалить"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
