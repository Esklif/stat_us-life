# status.

Welcome to **status.** - an immersive life-simulation and role-playing social network application.
Create a unique character, explore dynamic worlds, interact with AI-driven NPCs, complete quests, and build relationships in a living, breathing simulated environment!

[Русская версия (Russian Version)](README.ru.md)

## Features
- **Dynamic AI Worlds**: Create a world, define its lore, and the AI will dynamically generate events, quests, and characters based on your prompts.
- **Living Social Feed**: Read posts from the "system" (e.g. World Herald) and NPCs. The world reacts to your actions and quests.
- **Deep Relationships**: Interact with characters in the comment sections. Your responses affect your relationship percentage with them.
- **RPG Progression**: Level up, earn XP, and unlock unique skills as you progress through quests and random events.
- **Import / Export**: Seamlessly export your entire world state to a JSON file and import it anytime to continue your adventure on another device or keep safe backups.

## Tech Stack
- **Frontend**: React + Vite, Tailwind-like custom CSS
- **Mobile Container**: Capacitor (for Android & iOS builds)
- **State Management**: Zustand
- **AI Integration**: Custom LLM API wrapper (Gemini)

## Setup & Running
1. Clone the repository.
2. Navigate to the `app` directory: `cd app`
3. Install dependencies: `npm install`
4. Run locally for web: `npm run dev`
5. Build for Android: `npm run build && npx cap sync android`
   - Open in Android Studio or run `cd android && gradlew assembleDebug` to build the APK.

## Export & Import
World data is kept entirely locally. Use the `Export` and `Import` buttons on the main screen to backup your worlds to your device's Documents folder.
