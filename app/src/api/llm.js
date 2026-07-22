import useStore from '../store/useStore';

async function callLLM(systemPrompt, userPrompt, retries = 2) {
  const { apiSettings } = useStore.getState();
  
  let finalUserPrompt = userPrompt;
  const estimatedTokens = (systemPrompt.length + userPrompt.length) / 4;
  if (estimatedTokens > (apiSettings.maxTokens || 4000)) {
    const maxAllowedChars = Math.max(1000, ((apiSettings.maxTokens || 4000) * 4) - systemPrompt.length);
    // Truncate from the beginning to keep the end instructions
    if (finalUserPrompt.length > maxAllowedChars) {
      finalUserPrompt = "... [История обрезана из-за лимита токенов] ...\n" + finalUserPrompt.slice(-maxAllowedChars);
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${apiSettings.url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.key}`
        },
        body: JSON.stringify({
          model: apiSettings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: finalUserPrompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        let errText = response.statusText;
        try {
          const errJson = await response.json();
          if (errJson.error && errJson.error.message) errText = errJson.error.message;
        } catch(e) {}
        throw new Error(`Код ${response.status}: ${errText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      if (content.startsWith('```json')) content = content.replace(/^```json/, '');
      else if (content.startsWith('```')) content = content.replace(/^```/, '');
      if (content.endsWith('```')) content = content.replace(/```$/, '');
      
      return JSON.parse(content.trim());
    } catch (e) {
      if (attempt === retries) {
        console.error("Failed to parse JSON from LLM after retries", e);
        throw new Error("LLM error or invalid JSON after multiple attempts: " + e.message);
      }
      console.warn(`LLM parse failed, retrying (${attempt + 1}/${retries})...`, e);
    }
  }
}

export async function generateWelcomeBanner(world, userProfile) {
  // We keep this just in case, but onboarding will replace it.
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}\n\nYou are initializing a new world. Output JSON ONLY. Format:\n{"welcomeMessage": "Epic 1-2 sentence welcome", "firstQuest": "A starting task", "skillsToLevelUp": ["Skill 1", "Skill 2"]}\n\nIMPORTANT: All text MUST be in Russian.`;
  const userPrompt = `User bio: ${userProfile.bio}\nWorld Name: ${world.name}\nWorld Description: ${world.description}\n\nGenerate the day 1 welcome data.`;
  
  return await callLLM(systemPrompt, userPrompt);
}

export async function generateWorldOnboarding(world, userProfile) {
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}
You are initializing a new RPG social world for the user.
Generate the starting parameters for Day 1.
IMPORTANT: All text MUST be in Russian language.

Output JSON ONLY with the exact following structure:
{
  "day1Intro": "Атмосферное введение в социальную сеть этого мира (2-3 предложения), описывающее, где оказался пользователь.",
  "firstQuestName": "Название первого задания (ОБЯЗАТЕЛЬНО про онлайн-активность, например: 'Опубликовать первый пост про...', 'Запустить тред о...')",
  "firstQuestPostText": "Пример текста поста, который пользователь должен опубликовать, чтобы выполнить квест.",
  "skills": [
    { "name": "Название навыка 1", "desc": "Забавное описание того, зачем нужен навык", "progress": 0 },
    { "name": "Название навыка 2", "desc": "Забавное описание того, зачем нужен навык", "progress": 0 },
    { "name": "Название навыка 3", "desc": "Забавное описание того, зачем нужен навык", "progress": 0 }
  ]
}`;
  const userPrompt = `User bio: ${userProfile.bio}\nWorld Name: ${world.name}\nWorld Description: ${world.description}\n\nGenerate onboarding data.`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function generatePostSuggestions(world, userProfile, count = 4) {
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}
You are helping the user write a post in their social simulation world.
World Name: ${world.name}
Current Event: ${world.eventContext || "None"}
User Bio: ${userProfile.bio}

Generate ${count} distinct, short, interesting text options that the user could post right now.
IMPORTANT: All text MUST be in Russian language.

Output JSON ONLY with the exact structure:
{
  "suggestions": ["Текст 1", "Текст 2", "Текст 3", "Текст 4"]
}`;
  const userPrompt = `Generate ${count} post suggestions for me to tweet.`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function generateCharacterIntroPost(character, world) {
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}
The user just added a new character to the simulation.
World: ${world.name}
Character: ${character.name} (@${character.handle}) - ${character.lore}

Write an introductory post from this character as they "join" the network. It should reflect their personality.
IMPORTANT: All text MUST be in Russian language.

Output JSON ONLY with exact structure:
{
  "text": "Текст первого поста персонажа"
}`;
  const userPrompt = `Generate intro post for ${character.name}`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function upgradeSkillDescription(skill, newLevel, world) {
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}
The user just upgraded their skill "${skill.name}".
Old Level: ${skill.level || 0}
New Level: ${newLevel}
Old Description: "${skill.desc}"

Write a new, funny, and flavorful description (1 short sentence) for this skill that reflects their new level of mastery in the context of the "${world.name}" world.
IMPORTANT: All text MUST be in Russian language.

Output JSON ONLY with exact structure:
{
  "newDescription": "Новое смешное описание навыка"
}`;
  const userPrompt = `Upgrade skill description.`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function simulateBackgroundActivity(world) {
  const { apiSettings } = useStore.getState();
  const recentPosts = (world.posts || []).slice(0, 5).map(p => ({
    id: p.id,
    author: p.author.handle,
    text: p.text,
    replies: (p.replies || []).map(r => `${r.handle}: ${r.reply}`)
  }));
  const systemPrompt = `${apiSettings.systemPrompt}
You are managing the background simulation. Time has passed, and characters might want to do something.
World: ${world.name} - ${world.description}
World Characters: ${JSON.stringify(world.relationships)}
Recent Posts: ${JSON.stringify(recentPosts)}

Generate spontaneous background activity. 
"Posts" are STANDALONE new topics on a character's own page.
"Comments" are replies or reactions TO THE RECENT POSTS.
It is highly encouraged to generate at least 1-2 new posts or comments.
- If ANY post or reply in Recent Posts explicitly mentions a character via @handle, that character MUST reply in newComments.
- IMPORTANT: When characters address the player or each other, they MUST use the @ symbol before their handle (e.g. @alex_88), or use their real name.
IMPORTANT: All text MUST be in Russian language.

Output JSON ONLY with exact structure:
{
  "newPosts": [
    { "handle": "@characterHandle", "name": "Имя", "text": "Текст нового поста (отдельной темы) от лица персонажа" }
  ],
  "newComments": [
    { "postId": "id поста из Recent Posts", "handle": "@characterHandle", "name": "Имя", "reply": "Текст комментария/ответа на этот пост" }
  ]
}`;
  const userPrompt = `Generate background activity.`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function generateReactions(postText, world, author) {
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}
You are managing the social simulation. A character or user just posted a message.
World: ${world.name} - ${world.description}
World Characters: ${JSON.stringify(world.relationships)}
Current Event Context: ${world.eventContext || "None"}

IMPORTANT: All text MUST be in Russian language.

Generate immediate reactions (COMMENTS) from characters and random users. 
These are comments ON THE POST, NOT standalone feed posts. They should react directly to what the author just posted.
- If the post explicitly @mentions a character by their handle, that character MUST reply in characterReactions.
- IMPORTANT: When characters address the player or each other, they MUST use the @ symbol before their handle (e.g. @alex_88), or use their real name.
Output JSON ONLY with exact structure:
{
  "characterReactions": [
    { "handle": "@characterHandle", "name": "Имя", "reply": "Текст комментария" }
  ],
  "crowdReplies": [
    { "name": "Рандомный Юзер", "handle": "@random", "reply": "Текст комментария" }
  ]
}`;
  const userPrompt = `Author (@${author.handle}) posted: "${postText}"\nGenerate realistic comments/replies.`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function processWorldEffects(postText, world, userProfile) {
  const { apiSettings } = useStore.getState();
  const activeQuests = (world.quests || []).filter(q => q.status !== 'completed');
  const activeQuestsCount = activeQuests.length;
  const systemPrompt = `${apiSettings.systemPrompt}
You are managing the background simulation. The user just posted a message.
World: ${world.name}
User Skills (with mastery level): ${JSON.stringify(world.skills)}

Evaluate the post's impact on stats, relationships, and quests.
IMPORTANT: All text MUST be in Russian language.

Quests Logic:
- The user currently has the following active quests:
${JSON.stringify(activeQuests)}
- If the user's post fulfills any of these quests, mark them as "completed" in "questUpdates".
- If you mark an active quest as "completed", you MUST use its EXACT "questName" as provided above.
- You MUST ONLY award "xpGained" (e.g. 100-200) if at least one quest is completed. If NO quests are completed, "xpGained" MUST be 0.
- Ensure the number of current active quests minus completed quests plus "newQuests" equals EXACTLY 3. If the user has fewer than 3, generate enough to reach 3.

- If the user explicitly @mentions a character by their handle, that character MUST reply or be affected in some way.
- IMPORTANT: When characters address the player or each other, they MUST use the @ symbol before their handle (e.g. @alex_88), or use their real name.

Output JSON ONLY with exact structure:
{
  "xpGained": 15,
  "statsUpdates": { "humorGained": 1.0, "auraGained": 2.5 },
  "relationshipUpdates": [
    { "handle": "@characterHandle", "name": "Имя", "relationshipChange": 2, "note": "Короткое пояснение" }
  ],
  "notifications": [
    { "type": "system", "text": "Текст уведомления" }
  ],
  "questUpdates": [
    { "questName": "Название квеста", "status": "completed", "description": "Вы сделали это!" }
  ],
  "newQuests": [
    { "questName": "Новый квест", "description": "Описание нового квеста" }
  ],
  "newPostsFromCharacters": [
    { 
       "handle": "handle", 
       "name": "Имя", 
       "text": "САМОСТОЯТЕЛЬНЫЙ пост в ленту (НЕ комментарий к посту юзера!). Пишут о себе, лоре, реакция на мир.",
       "replies": [
          { "handle": "@random", "name": "Имя комментатора", "reply": "Коммент под этим постом NPC" }
       ]
    }
  ]
}`;
  const userPrompt = `World Characters: ${JSON.stringify(world.relationships)}\nUser (@${userProfile.handle}) posted: "${postText}"\nEvaluate the impact and generate updates.`;
  return await callLLM(systemPrompt, userPrompt);
}

export async function generateEvents(world) {
  const { apiSettings } = useStore.getState();
  const systemPrompt = `${apiSettings.systemPrompt}\n\nYou are managing a social simulation. Generate 3 interesting global events or trends that could happen in this world to spice things up. \nOutput JSON ONLY. Format: {"suggestedEvents": ["Событие 1", "Событие 2", "Событие 3"]}\n\nIMPORTANT: All text MUST be in Russian.`;
  const userPrompt = `World: ${world.name}\nDescription: ${world.description}\n\nGenerate events.`;
  
  return await callLLM(systemPrompt, userPrompt);
}

export async function processDirectMessage(chatHistory, character, world, userProfile) {
  const { apiSettings } = useStore.getState();
  
  const chatText = chatHistory.map(m => `${m.sender === 'user' ? userProfile.name : character.name}: ${m.text}`).join('\n');
  
  const systemPrompt = `${apiSettings.systemPrompt}
You are roleplaying as "${character.name}" (@${character.handle}) in a direct message chat with the user.
Your Bio/Lore: ${character.bio || "No specific lore"}
Relationship with user: ${character.percentage}% (0=Hates, 100=Loves)
User Hidden Description: ${userProfile.hiddenDescription || "None"}
Current World Event: ${world.eventContext || "None"}

Read the chat history and provide your next reply. Also evaluate if the relationship changes or if you want to give the user a side quest.
IMPORTANT: All text MUST be in Russian language.

Output JSON ONLY with exact structure:
{
  "reply": "Текст вашего ответа",
  "relationshipChange": 0,
  "newQuests": [
    { "questName": "Поручение от персонажа", "description": "Сделай что-то для меня" }
  ]
}`;

  const userPrompt = `Chat history:\n${chatText}\n\nGenerate your response.`;
  
  return await callLLM(systemPrompt, userPrompt);
}
