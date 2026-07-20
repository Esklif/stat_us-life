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
      <div className="level-hero">
        <div className="level-badge">{level}</div>
        <div className="level-info">
          <div className="level-label">Уровень {level}</div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill orange" style={{ width: `${xpPercent}%` }}></div>
          </div>
          <div className="level-xp">{xp}/{nextLvlXp} XP</div>
        </div>
      </div>

      <div className="flex-col gap-2">
        <h3 className="section-title">Глобальная цель</h3>
        <div className="card p-4 flex-col gap-3">
          <p className="text-secondary">{world.description || "Цифровой ландшафт, где проклятая энергия течет через каждый тред..."}</p>
          <button onClick={() => setShowCustomize(true)} className="btn btn-secondary w-full">Настроить мир</button>
        </div>
      </div>

      {quests.length > 0 && (
        <div className="flex-col gap-2">
          <h3 className="section-title">Сайдквесты</h3>
          <div className="flex-col gap-3">
            {quests.map((q, idx) => (
              <div key={idx} className="quest-card">
                <div className="quest-name">{q.questName}</div>
                <div className="quest-desc">{q.description}</div>
                <div className={`quest-status ${q.status === 'completed' ? 'completed' : 'active'}`}>
                  {q.status === 'completed' ? 'Выполнено' : 'Активно'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-col gap-2 pb-20">
        <h3 className="section-title">Навыки</h3>
        <div className="flex justify-between items-center mb-2">
          <span className="badge badge-orange">Доступно очков: {skillPoints}</span>
        </div>
        <div className="flex-col gap-4">
          {(world.skills || []).map((skill, idx) => (
            <div key={idx} className="skill-card">
              <div className="skill-header">
                <div className="skill-name">{skill.name}</div>
                <div className="skill-level">Уровень {skill.level || 0}</div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="skill-desc">
                  {skill.desc}
                </div>
                {skillPoints > 0 && (skill.level || 0) < 100 && (
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
                  }} className="skill-upgrade-btn">
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCustomize && (
        <div className="modal-overlay">
           <div className="card w-full flex-col" style={{ maxWidth: '400px' }}>
             <header className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
               <h3 className="modal-title">Настройка мира</h3>
               <button onClick={() => setShowCustomize(false)} className="btn btn-secondary">Закрыть</button>
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
