import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { Target, HelpCircle, ChevronRight, Plus } from 'lucide-react';
import { upgradeSkillDescription } from '../../api/llm';

export default function QuestsTab({ world }) {
  const { updateWorldData } = useStore();
  const [showCustomize, setShowCustomize] = useState(false);
  const [newDesc, setNewDesc] = useState(world.description || '');

  const level = world.level || 1;
  const xp = world.xp || 0;
  const skillPoints = world.skillPoints || 0;
  const nextLvlXp = Math.floor(100 * Math.pow(1.5, Math.max(0, level - 1)));
  const xpPercent = Math.min(100, (xp / nextLvlXp) * 100);
  const quests = (world.quests || []).filter(q => q.status !== 'completed');

  return (
    <div className="p-4 flex-col gap-6">
      <div className="flex items-center gap-4">
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Уровень {level}</div>
        <div className="flex-1 progress-bar-bg" style={{ height: '12px' }}>
          <div className="progress-bar-fill orange" style={{ width: `${xpPercent}%` }}></div>
        </div>
        <div style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem' }}>{xp}/{nextLvlXp} XP</div>
        {skillPoints > 0 && (
          <button className="btn-icon" style={{ backgroundColor: 'var(--accent-orange)', color: '#fff', width: '32px', height: '32px' }}><Plus size={16} /></button>
        )}
      </div>
      
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Сводка</h2>

      <div className="flex-col gap-2">
        <h3 style={{ fontSize: '1.1rem' }}>Глобальная цель</h3>
        <div className="card p-4 flex-col gap-3">
          <p style={{ fontSize: '0.85rem' }}>{world.description || "Цифровой ландшафт, где проклятая энергия течет через каждый тред..."}</p>
          <button onClick={() => setShowCustomize(true)} className="btn btn-secondary w-full" style={{ fontSize: '0.9rem', padding: '0.5rem' }}>Настроить мир</button>
        </div>
      </div>

      {quests.length > 0 && (
        <div className="flex-col gap-2">
          <h3 style={{ fontSize: '1.1rem' }}>Сайдквесты</h3>
          <div className="flex-col gap-3">
            {quests.map((q, idx) => (
              <div key={idx} className="card p-4 flex-col gap-2" style={{ minHeight: 'fit-content', overflow: 'visible', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold', lineHeight: '1.3' }}>{q.questName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{q.description}</div>
                <div style={{ fontSize: '0.8rem', color: q.status === 'completed' ? 'var(--success-color)' : 'var(--accent-orange)', fontWeight: 'bold', alignSelf: 'flex-end', marginTop: '4px' }}>
                  {q.status === 'completed' ? 'Выполнено' : 'Активно'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-col gap-2 pb-20">
        <h3 style={{ fontSize: '1.1rem' }}>Навыки</h3>
        <div className="flex justify-between items-center mb-2">
          <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem' }}>Доступно очков: {skillPoints}</span>
        </div>
        <div className="flex-col gap-4">
          {(world.skills || []).map((skill, idx) => (
            <div key={idx} className="flex-col gap-1" style={{ marginBottom: '0.5rem' }}>
              <div className="flex justify-between items-center">
                <div style={{ fontWeight: 'bold' }}>{skill.name}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Уровень {skill.level || 0}</div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.3' }}>
                  {skill.desc}
                </div>
                {skillPoints > 0 && (
                  <button onClick={() => {
                    const currentLevel = skill.level || 0;
                    const newLevel = currentLevel + 1;
                    
                    updateWorldData(world.id, w => {
                      const newSkills = [...w.skills];
                      newSkills[idx] = { ...newSkills[idx], level: newLevel };
                      return { ...w, skills: newSkills, skillPoints: w.skillPoints - 1 };
                    });

                    upgradeSkillDescription(skill, newLevel, world).then(res => {
                       if (res && res.newDescription) {
                          useStore.getState().updateWorldData(world.id, w => {
                             const newSkills = [...w.skills];
                             newSkills[idx] = { ...newSkills[idx], desc: res.newDescription };
                             return { ...w, skills: newSkills };
                          });
                       }
                    }).catch(e => console.error("Failed to upgrade skill desc", e));
                  }} className="btn-icon flex items-center justify-center" style={{ backgroundColor: 'var(--accent-orange)', color: '#fff', width: '28px', height: '28px', flexShrink: 0, padding: 0, borderRadius: '50%' }}>
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCustomize && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
           <div className="card w-full flex-col" style={{ maxWidth: '400px' }}>
             <header className="p-4 border-b flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
               <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Настройка мира</h3>
               <button onClick={() => setShowCustomize(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Закрыть</button>
             </header>
             <div className="p-4 flex-col gap-3">
               <label className="input-label">Описание мира</label>
               <textarea className="input-field" style={{ minHeight: '120px' }} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Опишите лор и атмосферу мира..."></textarea>
               <button className="btn btn-primary mt-2" onClick={() => {
                 updateWorldData(world.id, w => ({ ...w, description: newDesc }));
                 setShowCustomize(false);
               }}>Сохранить</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
