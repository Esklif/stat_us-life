import React, { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { generateWorldOnboarding } from '../../api/llm';
import { Sun, Target, Swords } from 'lucide-react';

const loadingPhrases = [
  "Установка нейронных связей...",
  "Генерация лора и атмосферы...",
  "Создание персонажей...",
  "Расчет кармических узлов...",
  "Синтез первых заданий...",
  "Инициализация симуляции..."
];

const LoadingScreen = () => {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx(prev => (prev + 1) % loadingPhrases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-color)', borderRadius: '50%', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.7 }}></div>
        <div style={{ position: 'absolute', inset: '15px', border: '2px dashed var(--accent-purple)', borderRadius: '50%', animation: 'spin 4s linear infinite' }}></div>
        <div style={{ position: 'absolute', inset: '30px', backgroundColor: 'var(--surface-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', letterSpacing: '2px' }}>AI</span>
        </div>
      </div>
      
      <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ 
          color: 'var(--accent-color)', 
          fontSize: '1.1rem', 
          fontWeight: 'bold',
          letterSpacing: '1px',
          animation: 'pulse 1.5s infinite'
        }}>
          {loadingPhrases[phraseIdx]}
        </p>
      </div>

      <div style={{ marginTop: '2rem', width: '100%', maxWidth: '200px', height: '4px', backgroundColor: 'var(--surface-color)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', backgroundColor: 'var(--accent-color)', width: '40%', animation: 'slide 1.5s ease-in-out infinite alternate' }}></div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes slide {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default function WorldOnboarding({ world, onComplete }) {
  const { userProfile: defaultProfile, updateWorldData } = useStore();
  const userProfile = world.userProfile || defaultProfile;
  const [step, setStep] = useState(0); // 0: Bio, 1: Loading, 2: Day 1, 3: First Quest, 4: Skills
  const [bio, setBio] = useState(userProfile.bio || '');
  const [firstPostText, setFirstPostText] = useState('');
  
  const [onboardingData, setOnboardingData] = useState(null);
  const [loadingError, setLoadingError] = useState(null);

  const handleCreateBio = async () => {
    updateWorldData(world.id, w => ({ ...w, userProfile: { ...userProfile, bio } }));
    setStep(1); // Loading
    try {
      const data = await generateWorldOnboarding(world, { ...userProfile, bio });
      setOnboardingData(data);
      setFirstPostText(data.firstQuestPostText || '');
      setStep(2); // Day 1
    } catch (e) {
      setLoadingError(e.message);
      setStep(0); // Go back to bio if failed
    }
  };

  const handleFinish = () => {
    // Add generated skills and quest to world
    updateWorldData(world.id, w => ({
      ...w,
      skills: onboardingData.skills || [],
      quests: [
        {
          questName: onboardingData.firstQuestName,
          description: 'Первое задание',
          status: 'active'
        }
      ],
      isInitialized: true
    }));
    
    // Add the first post to the feed automatically
    if (firstPostText.trim()) {
      updateWorldData(world.id, w => ({
        ...w,
        posts: [
          {
            id: Date.now().toString(),
            text: firstPostText,
            author: userProfile,
            type: 'post',
            timestamp: new Date().toISOString()
          },
          ...(w.posts || [])
        ]
      }));
    }
    
    onComplete(onboardingData);
  };

  if (step === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>Создание профиля</h2>
        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Напишите свое Био</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Ваша биография задает тон тому, кем вы являетесь в этой игре.
        </p>
        <textarea
          className="input-field flex-1"
          style={{ minHeight: '150px', fontSize: '1.1rem' }}
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Начинающий маг, люблю кошек..."
        />
        <button className="btn btn-primary mt-4" onClick={handleCreateBio} disabled={!bio.trim()}>
          Создать мир
        </button>
        {loadingError && <div style={{ color: 'var(--danger-color)', marginTop: '1rem', textAlign: 'center' }}>Ошибка: {loadingError}</div>}
      </div>
    );
  }

  if (step === 1) {
    return <LoadingScreen />;
  }

  if (step === 2) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <div className="flex-1 flex-col justify-center">
          <div className="flex items-center gap-2 mb-6" style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <Sun size={24} /> День 1
          </div>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>
            {onboardingData?.day1Intro}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setStep(3)}>
          Далее
        </button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <div className="flex-1 flex-col justify-center">
          <div className="flex items-center gap-2 mb-6" style={{ color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <Target size={24} /> Первый квест
          </div>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
            {onboardingData?.firstQuestName}
          </p>
          <div className="card p-4 flex-col gap-2 bg-surface">
            <div className="flex items-center gap-2">
              <div className="avatar" style={{ width: 32, height: 32, backgroundImage: userProfile.avatar ? `url(${userProfile.avatar})` : 'none', backgroundColor: '#333' }}>
                {!userProfile.avatar && userProfile.name.charAt(0)}
              </div>
              <div style={{ fontWeight: 'bold' }}>{userProfile.name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>@{userProfile.handle}</div>
            </div>
            <textarea 
              className="input-field mt-2" 
              style={{ minHeight: '80px', fontSize: '1.1rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', padding: '8px', color: 'var(--text-color)' }}
              value={firstPostText}
              onChange={e => setFirstPostText(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setStep(4)}>
          Понятно
        </button>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <div className="flex-1 flex-col justify-center">
          <div className="flex items-center gap-2 mb-6" style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <Swords size={24} /> Прокачивайте эти навыки
          </div>
          <div className="flex-col gap-4">
            {(onboardingData?.skills || []).map((s, i) => (
              <div key={i} className="card p-4">
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>{s.name}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleFinish}>
          Начать!
        </button>
      </div>
    );
  }

  return null;
}
