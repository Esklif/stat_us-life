import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBackStore = create((set) => ({
  handlers: [],
  pushHandler: (id, fn) => set((state) => ({ handlers: [...state.handlers, { id, fn }] })),
  removeHandler: (id) => set((state) => ({ handlers: state.handlers.filter(h => h.id !== id) })),
}));

const useStore = create(
  persist(
    (set, get) => ({
      apiSettings: {
        url: 'https://api.openai.com/v1',
        key: '',
        model: 'gpt-4o-mini',
        maxTokens: 4000,
        systemPrompt: 'You are managing a strict social network simulation (like Twitter or Reddit). Characters ONLY communicate via online posts, comments, and direct messages. They NEVER interact in physical reality. All events, quests, and actions MUST be framed as online activities (e.g., "write a post about X", "reply to Y", "start a drama thread", "cancel Z"). Do NOT generate real-life physical quests (like "pass an interview" or "go to the store").',
      },
      setApiSettings: (settings) => set({ apiSettings: settings }),

      isFirstLogin: true,
      setIsFirstLogin: (val) => set({ isFirstLogin: val }),

      theme: 'dark',
      toggleTheme: () => set(state => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
      }),

      worlds: [],
      addWorld: (world) => set((state) => ({ 
        worlds: [...state.worlds, { 
          ...world, 
          id: Date.now().toString(), 
          day: 1, 
          posts: [], 
          quests: [],
          level: 1,
          xp: 0,
          skillPoints: 0,
          skills: [
            { name: "Cursed Rhetoric", desc: "as harmless as a wet napkin", level: 0 },
            { name: "Domain Presence", desc: "non-existent as a monk's cursed energy", level: 0 },
            { name: "Provocative Wit", desc: "sadder than a Grade 4 fly head", level: 0 }
          ],
          stats: { humor: 0.0, aura: 0.0 },
          followers: 0,
          relationships: [],
          notifications: [],
          activityLog: [],
          userProfile: {
            name: 'Player',
            handle: 'player',
            avatar: null,
            bio: 'Just another spark in this timeline.',
            hiddenDescription: ''
          }
        }] 
      })),
      deleteWorld: (worldId) => set((state) => ({
        worlds: state.worlds.filter(w => w.id !== worldId),
        activeWorldId: state.activeWorldId === worldId ? null : state.activeWorldId
      })),
      
      activeWorldId: null,
      setActiveWorldId: (id) => set({ activeWorldId: id }),

      userProfile: {
        name: 'Player',
        handle: 'player',
        avatar: null,
        bio: 'Just another spark in this timeline.',
        hiddenDescription: ''
      },
      setUserProfile: (profile) => set({ userProfile: profile }),

      updateWorldData: (worldId, updater) => set((state) => ({
        worlds: state.worlds.map(w => w.id === worldId ? updater(w) : w)
      })),
      
      importWorld: (worldData) => set((state) => ({
        worlds: [...state.worlds, { ...worldData, id: Date.now().toString() }]
      }))
    }),
    {
      name: 'social-sim-storage',
    }
  )
);

export default useStore;
