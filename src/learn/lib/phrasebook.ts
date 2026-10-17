import type { Course } from '../types'
import { normalizeCourse } from './normalize'

/** The 10 phrases every traveller needs, in this order for every language */
export const MEANINGS = [
  'Hello',
  'Goodbye',
  'Please',
  'Thank you',
  'Yes',
  'No',
  'Excuse me / Sorry',
  'Do you speak English?',
  'How much is it?',
  'Where is the toilet?',
]

export interface Language {
  id: string
  name: string
  flag: string
  /** Speech code so the phone reads the phrase in the right voice */
  lang: string
  /** False for scripts like Japanese, where we show the pronunciation next to the phrase */
  latin: boolean
  /** [phrase, easy pronunciation] for each of the 10 meanings */
  entries: [string, string][]
}

export const LANGUAGES: Language[] = [
  {
    id: 'es', name: 'Spanish', flag: '🇪🇸', lang: 'es-ES', latin: true,
    entries: [['Hola', 'OH-lah'], ['Adiós', 'ah-dee-OHS'], ['Por favor', 'por fah-BOR'], ['Gracias', 'GRAH-see-ahs'], ['Sí', 'see'], ['No', 'noh'], ['Perdón', 'per-DOHN'], ['¿Habla inglés?', 'AH-blah een-GLEHS'], ['¿Cuánto cuesta?', 'KWAN-toh KWEHS-tah'], ['¿Dónde está el baño?', 'DOHN-deh ehs-TAH el BAH-nyoh']],
  },
  {
    id: 'fr', name: 'French', flag: '🇫🇷', lang: 'fr-FR', latin: true,
    entries: [['Bonjour', 'bon-ZHOOR'], ['Au revoir', 'oh ruh-VWAHR'], ["S'il vous plaît", 'seel voo PLEH'], ['Merci', 'mehr-SEE'], ['Oui', 'wee'], ['Non', 'noh'], ['Excusez-moi', 'ex-kew-zay MWAH'], ['Parlez-vous anglais ?', 'par-lay VOO ahn-GLEH'], ["C'est combien ?", 'say kom-BYAN'], ['Où sont les toilettes ?', 'oo son lay twah-LET']],
  },
  {
    id: 'it', name: 'Italian', flag: '🇮🇹', lang: 'it-IT', latin: true,
    entries: [['Buongiorno', 'bwon-JOR-noh'], ['Arrivederci', 'ah-ree-veh-DER-chee'], ['Per favore', 'per fah-VOH-reh'], ['Grazie', 'GRAHT-see-eh'], ['Sì', 'see'], ['No', 'noh'], ['Scusi', 'SKOO-zee'], ['Parla inglese?', 'PAR-lah een-GLEH-zeh'], ['Quanto costa?', 'KWAN-toh KOH-stah'], ["Dov'è il bagno?", 'doh-VEH eel BAH-nyoh']],
  },
  {
    id: 'de', name: 'German', flag: '🇩🇪', lang: 'de-DE', latin: true,
    entries: [['Hallo', 'HAH-loh'], ['Auf Wiedersehen', 'owf VEE-der-zay-en'], ['Bitte', 'BIT-teh'], ['Danke', 'DAHN-keh'], ['Ja', 'yah'], ['Nein', 'nine'], ['Entschuldigung', 'ent-SHOOL-dee-goong'], ['Sprechen Sie Englisch?', 'SHPREH-khen zee ENG-lish'], ['Wie viel kostet das?', 'vee FEEL KOS-tet dahs'], ['Wo ist die Toilette?', 'voh ist dee toy-LET-teh']],
  },
  {
    id: 'pt', name: 'Portuguese', flag: '🇧🇷', lang: 'pt-BR', latin: true,
    entries: [['Olá', 'oh-LAH'], ['Tchau', 'chow'], ['Por favor', 'por fah-VOR'], ['Obrigado / Obrigada', 'oh-bree-GAH-doh / oh-bree-GAH-dah'], ['Sim', 'seem'], ['Não', 'nowng'], ['Desculpe', 'dess-KOOL-peh'], ['Você fala inglês?', 'voh-SEH FAH-lah een-GLEHS'], ['Quanto custa?', 'KWAN-too KOOS-tah'], ['Onde fica o banheiro?', 'ON-jee FEE-kah oo bah-NYAY-roo']],
  },
  {
    id: 'nl', name: 'Dutch', flag: '🇳🇱', lang: 'nl-NL', latin: true,
    entries: [['Hallo', 'HAH-loh'], ['Tot ziens', 'tot ZEENS'], ['Alstublieft', 'AHL-stoo-bleeft'], ['Dank u wel', 'dahnk oo VEL'], ['Ja', 'yah'], ['Nee', 'nay'], ['Pardon', 'par-DON'], ['Spreekt u Engels?', 'spraykt oo ENG-els'], ['Hoeveel kost het?', 'hoo-VAYL kost het'], ['Waar is het toilet?', 'vahr iss het twah-LET']],
  },
  {
    id: 'el', name: 'Greek', flag: '🇬🇷', lang: 'el-GR', latin: false,
    entries: [['Γεια σας', 'YAH sas'], ['Αντίο', 'an-DEE-oh'], ['Παρακαλώ', 'pah-rah-kah-LOH'], ['Ευχαριστώ', 'ef-hah-ree-STOH'], ['Ναι', 'neh'], ['Όχι', 'OH-hee'], ['Συγγνώμη', 'see-GHNOH-mee'], ['Μιλάτε αγγλικά;', 'mee-LAH-teh ahng-lee-KAH'], ['Πόσο κάνει;', 'POH-soh KAH-nee'], ['Πού είναι η τουαλέτα;', 'poo EE-neh ee too-ah-LEH-tah']],
  },
  {
    id: 'tr', name: 'Turkish', flag: '🇹🇷', lang: 'tr-TR', latin: true,
    entries: [['Merhaba', 'MEHR-hah-bah'], ['Hoşça kal', 'hosh-CHAH kahl'], ['Lütfen', 'LOOT-fen'], ['Teşekkür ederim', 'teh-shek-KOOR eh-deh-RIM'], ['Evet', 'EH-vet'], ['Hayır', 'HAH-yuhr'], ['Affedersiniz', 'AHF-feh-der-see-neez'], ['İngilizce biliyor musunuz?', 'in-gee-LEEZ-jeh bee-lee-YOR moo-soo-NOOZ'], ['Bu ne kadar?', 'boo neh kah-DAR'], ['Tuvalet nerede?', 'too-vah-LET NEH-reh-deh']],
  },
  {
    id: 'ja', name: 'Japanese', flag: '🇯🇵', lang: 'ja-JP', latin: false,
    entries: [['こんにちは', 'kon-nee-chee-wah'], ['さようなら', 'sah-yoh-nah-rah'], ['お願いします', 'oh-neh-guy-shee-mas'], ['ありがとう', 'ah-ree-gah-toh'], ['はい', 'hai'], ['いいえ', 'ee-eh'], ['すみません', 'soo-mee-mah-sen'], ['英語を話せますか？', 'ay-go oh hah-nah-seh-mas kah'], ['いくらですか？', 'ee-koo-rah dess kah'], ['トイレはどこですか？', 'toy-reh wah doh-koh dess kah']],
  },
  {
    id: 'zh', name: 'Mandarin', flag: '🇨🇳', lang: 'zh-CN', latin: false,
    entries: [['你好', 'nee how'], ['再见', 'dzai-jyen'], ['请', 'ching'], ['谢谢', 'shyeh-shyeh'], ['是', 'shir'], ['不是', 'boo shir'], ['对不起', 'dway-boo-chee'], ['你会说英语吗？', 'nee hway shwaw ying-yoo mah'], ['多少钱？', 'dwaw-shaow chyen'], ['厕所在哪里？', 'tsuh-swaw dzai nah-lee']],
  },
  {
    id: 'ko', name: 'Korean', flag: '🇰🇷', lang: 'ko-KR', latin: false,
    entries: [['안녕하세요', 'ahn-nyeong-hah-seh-yo'], ['안녕히 계세요', 'ahn-nyeong-hee gyeh-seh-yo'], ['주세요', 'joo-seh-yo'], ['감사합니다', 'gam-sah-ham-nee-da'], ['네', 'neh'], ['아니요', 'ah-nee-yo'], ['죄송합니다', 'jwe-song-ham-nee-da'], ['영어 하세요?', 'yeong-eo hah-seh-yo'], ['얼마예요?', 'ul-ma-yeh-yo'], ['화장실이 어디예요?', 'hwah-jang-shil-ee uh-dee-yeh-yo']],
  },
]

/**
 * Word by word meanings for the multi word phrases, by phrase index. Scripts
 * without spaces between words (Japanese, Mandarin) and Korean are left out.
 */
const GLOSSES: Record<string, Record<number, [string, string][]>> = {
  es: {
    2: [['Por', 'for'], ['favor', 'favour']],
    7: [['Habla', 'do you speak (polite)'], ['inglés', 'English']],
    8: [['Cuánto', 'how much'], ['cuesta', 'does it cost']],
    9: [['Dónde', 'where'], ['está', 'is'], ['el', 'the'], ['baño', 'bathroom']],
  },
  fr: {
    1: [['Au', 'until the'], ['revoir', 'seeing again']],
    2: [["S'il", 'if it'], ['vous', 'you'], ['plaît', 'pleases']],
    6: [['Excusez-moi', 'excuse me']],
    7: [['Parlez-vous', 'do you speak'], ['anglais', 'English']],
    8: [["C'est", 'it is'], ['combien', 'how much']],
    9: [['Où', 'where'], ['sont', 'are'], ['les', 'the'], ['toilettes', 'toilets']],
  },
  it: {
    2: [['Per', 'for'], ['favore', 'favour']],
    7: [['Parla', 'do you speak (polite)'], ['inglese', 'English']],
    8: [['Quanto', 'how much'], ['costa', 'does it cost']],
    9: [["Dov'è", 'where is'], ['il', 'the'], ['bagno', 'bathroom']],
  },
  de: {
    1: [['Auf', 'until'], ['Wiedersehen', 'seeing again']],
    7: [['Sprechen', 'speak'], ['Sie', 'you (polite)'], ['Englisch', 'English']],
    8: [['Wie viel', 'how much'], ['kostet', 'costs'], ['das', 'that']],
    9: [['Wo', 'where'], ['ist', 'is'], ['die', 'the'], ['Toilette', 'toilet']],
  },
  pt: {
    2: [['Por', 'for'], ['favor', 'favour']],
    3: [['Obrigado', 'thank you (said by a man)'], ['Obrigada', 'thank you (said by a woman)']],
    7: [['Você', 'you'], ['fala', 'speak'], ['inglês', 'English']],
    8: [['Quanto', 'how much'], ['custa', 'does it cost']],
    9: [['Onde', 'where'], ['fica', 'is (located)'], ['o', 'the'], ['banheiro', 'bathroom']],
  },
  nl: {
    1: [['Tot', 'until'], ['ziens', 'seeing']],
    3: [['Dank', 'thank'], ['u', 'you (polite)'], ['wel', 'very much']],
    7: [['Spreekt', 'speak'], ['u', 'you (polite)'], ['Engels', 'English']],
    8: [['Hoeveel', 'how much'], ['kost', 'costs'], ['het', 'it']],
    9: [['Waar', 'where'], ['is', 'is'], ['het', 'the'], ['toilet', 'toilet']],
  },
  tr: {
    1: [['Hoşça', 'pleasantly'], ['kal', 'stay']],
    3: [['Teşekkür', 'thanks'], ['ederim', 'I do']],
    7: [['İngilizce', 'English'], ['biliyor', 'know'], ['musunuz', 'do you (polite)']],
    8: [['Bu', 'this'], ['ne kadar', 'how much']],
    9: [['Tuvalet', 'toilet'], ['nerede', 'where']],
  },
  el: {
    0: [['Γεια', 'health (hello)'], ['σας', 'to you (polite)']],
    7: [['Μιλάτε', 'do you speak'], ['αγγλικά', 'English']],
    8: [['Πόσο', 'how much'], ['κάνει', 'does it cost']],
    9: [['Πού', 'where'], ['είναι', 'is'], ['η', 'the'], ['τουαλέτα', 'toilet']],
  },
}

/** Everyday moments for the "what would you say?" questions, by phrase index */
const SITUATIONS = [
  'You walk into a small shop. What do you say first?',
  'You are leaving a café after paying. What do you say?',
  'You are ordering a coffee and want to sound polite. What do you add?',
  'A stranger has just given you directions. What do you say?',
  'The waiter asks if you would like the bill. You would. What do you say?',
  'Someone offers you a menu you do not need. What do you say?',
  'You need to squeeze past someone on a busy train. What do you say?',
  'You are lost and want to check whether someone can help in English. What do you ask?',
  'You like a scarf at a market stall. What do you ask the seller?',
  'You are in a restaurant and need the toilet. What do you ask?',
]

type Style = 'intro' | 'listen' | 'situation' | 'mix'

interface UnitPlan {
  title: string
  emoji: string
  description: string
  lessons: { title: string; emoji: string; idx: number[]; tip: string; style: Style; newPhrases?: boolean }[]
}

const UNITS: UnitPlan[] = [
  {
    title: 'Unit 1: Be polite',
    emoji: '🙂',
    description: 'Greet people and say thanks.',
    lessons: [
      { title: 'Hello and goodbye', emoji: '👋', idx: [0, 1], tip: 'Say hello when you walk into a shop or café. Locals **notice** it.', style: 'intro', newPhrases: true },
      { title: 'Please and thank you', emoji: '🙏', idx: [2, 3], tip: 'Politeness goes a long way. Use **please** and **thank you** every time you ask for something.', style: 'intro', newPhrases: true },
      { title: 'Yes and no', emoji: '👍', idx: [4, 5], tip: 'Short answers help when someone asks you a question.', style: 'intro', newPhrases: true },
    ],
  },
  {
    title: 'Unit 2: Get by',
    emoji: '🧭',
    description: 'Ask for help and find your way.',
    lessons: [
      { title: 'Excuse me', emoji: '🙋', idx: [6, 7], tip: 'Start with **excuse me** to get attention, then ask if they speak English.', style: 'intro', newPhrases: true },
      { title: 'Prices and toilets', emoji: '🚻', idx: [8, 9], tip: 'Point at what you want, then ask the **price**. Learn the toilet phrase before you need it.', style: 'intro', newPhrases: true },
    ],
  },
  {
    title: 'Unit 3: Tune your ear',
    emoji: '👂',
    description: 'Recognise the polite basics when you hear them.',
    lessons: [
      { title: 'Greetings by ear', emoji: '🎧', idx: [0, 2, 3], tip: 'People speak faster than you expect. Listen for the **first sound** of each phrase.', style: 'listen' },
      { title: 'Answers by ear', emoji: '🔊', idx: [4, 5, 1], tip: 'Yes and no are short, so they are easy to miss. Replay them as often as you like.', style: 'listen' },
      { title: 'Asking by ear', emoji: '🗣️', idx: [6, 7, 9], tip: 'Questions often rise at the end. Listen for the **tone** as well as the words.', style: 'listen' },
    ],
  },
  {
    title: 'Unit 4: Real situations',
    emoji: '🏙️',
    description: 'Pick the right phrase for the moment.',
    lessons: [
      { title: 'In a café', emoji: '☕', idx: [0, 2, 3, 4], tip: 'A typical café visit: **hello**, order with **please**, then **thank you** on the way out.', style: 'situation' },
      { title: 'At the market', emoji: '🛍️', idx: [8, 5, 1, 6], tip: 'Ask the price first. A polite **no** is fine if it is more than you want to pay.', style: 'situation' },
      { title: 'Getting around', emoji: '🚆', idx: [6, 7, 9, 3], tip: 'Open with **excuse me**, ask your question, and finish with **thank you**.', style: 'situation' },
    ],
  },
  {
    title: 'Unit 5: Mix it up',
    emoji: '🔀',
    description: 'All 10 phrases, in any order.',
    lessons: [
      { title: 'First five', emoji: '🧩', idx: [0, 1, 2, 3, 4], tip: 'Mixed practice is harder than one phrase at a time, and that is why it sticks.', style: 'mix' },
      { title: 'Last five', emoji: '🎯', idx: [5, 6, 7, 8, 9], tip: 'Say each answer out loud before you tap it. Speaking helps you remember.', style: 'mix' },
      { title: 'Everything', emoji: '🏁', idx: [9, 0, 7, 3, 8, 6], tip: 'One last round with everything you know. Take your time.', style: 'mix' },
    ],
  },
]

export function languageLabel(lang: Language): string {
  return `${lang.name} for travellers`
}

const words = (s: string) => s.trim().split(/\s+/).length

/**
 * Wrong answers that look like the right one: phrases closest in word count
 * and length, so a full question is never up against a one word answer.
 */
export function similarIndexes(i: number, n: number, text: (j: number) => string, pool: number[] = MEANINGS.map((_, j) => j)): number[] {
  const t = text(i)
  return pool
    .filter((j) => j !== i && text(j) !== t)
    .sort((a, b) => {
      const da = Math.abs(words(text(a)) - words(t)) * 10 + Math.abs(text(a).length - t.length)
      const db = Math.abs(words(text(b)) - words(t)) * 10 + Math.abs(text(b).length - t.length)
      return da - db || a - b
    })
    .slice(0, n)
}

/** Builds the ready made travel phrase course, with no AI and no file to import */
export function buildLanguageCourse(lang: Language): Course {
  const show = (i: number) => (lang.latin ? lang.entries[i][0] : `${lang.entries[i][0]} (${lang.entries[i][1]})`)
  const meaning = (i: number) => MEANINGS[i]
  const gloss = GLOSSES[lang.id] ?? {}
  const phrase = (i: number) => ({
    text: lang.entries[i][0],
    say: lang.entries[i][1],
    meaning: MEANINGS[i],
    words: (gloss[i] ?? []).map(([w, m]) => ({ w, m })),
  })
  const askMeaning = (i: number) => ({
    type: 'mcq', prompt: `What does ${show(i)} mean?`, options: [i, ...similarIndexes(i, 3, meaning)].map(meaning), answer: 0,
    explanation: `${show(i)} means "${MEANINGS[i]}".`,
  })
  const askPhrase = (i: number) => ({
    type: 'mcq', prompt: `How do you say "${MEANINGS[i]}" in ${lang.name}?`, options: [i, ...similarIndexes(i, 3, show)].map(show), answer: 0,
    explanation: `"${MEANINGS[i]}" is ${show(i)}.`,
  })
  const listen = (i: number) => ({
    type: 'mcq', prompt: 'Listen. What does it mean?', audio: lang.entries[i][0], options: [i, ...similarIndexes(i, 3, meaning)].map(meaning), answer: 0,
    explanation: `You heard ${show(i)}, which means "${MEANINGS[i]}".`,
  })
  const listenPick = (i: number) => ({
    type: 'mcq', prompt: 'Listen. Which phrase did you hear?', audio: lang.entries[i][0], options: [i, ...similarIndexes(i, 3, show)].map(show), answer: 0,
    explanation: `You heard ${show(i)}.`,
  })
  const situation = (i: number) => ({
    type: 'mcq', prompt: SITUATIONS[i], options: [i, ...similarIndexes(i, 3, show)].map(show), answer: 0,
    explanation: `${show(i)} means "${MEANINGS[i]}", which fits here.`,
  })
  const trueFalse = (i: number, honest: boolean) => {
    const [wrong] = similarIndexes(i, 1, meaning)
    return honest
      ? { type: 'tf', statement: `${show(i)} means "${MEANINGS[i]}".`, answer: true, explanation: `Yes, ${show(i)} means "${MEANINGS[i]}".` }
      : { type: 'tf', statement: `${show(i)} means "${MEANINGS[wrong]}".`, answer: false, explanation: `It actually means "${MEANINGS[i]}".` }
  }
  const cloze = (i: number) => ({
    type: 'cloze', sentence: `In ${lang.name}, "${MEANINGS[i]}" is ___.`, answer: show(i), distractors: similarIndexes(i, 3, show).map(show),
    explanation: `"${MEANINGS[i]}" is ${show(i)}.`,
  })
  const match = (idx: number[]) => {
    const set = [...new Set([...idx, ...similarIndexes(idx[0], 4, meaning)])].slice(0, 4)
    return { type: 'match', prompt: 'Match the pairs', pairs: set.map((i) => ({ left: MEANINGS[i], right: show(i) })) }
  }

  const exercisesFor = (idx: number[], style: Style) => {
    const [a, b = a, c = b] = idx
    switch (style) {
      case 'intro':
        return [askMeaning(a), listen(b), askPhrase(a), trueFalse(b, true), trueFalse(a, false), cloze(b), match(idx)]
      case 'listen':
        return [listen(a), listenPick(b), listen(c), listenPick(a), askPhrase(c), trueFalse(b, false), match(idx)]
      case 'situation':
        return [...idx.map(situation), listen(idx[idx.length - 1]), cloze(b), match(idx)]
      case 'mix':
        return [askPhrase(a), listen(b), situation(c), askMeaning(idx[3] ?? a), cloze(idx[4] ?? b), listenPick(idx[5] ?? c), trueFalse(a, false), match(idx)]
    }
  }

  const raw = {
    title: languageLabel(lang),
    emoji: lang.flag,
    lang: lang.lang,
    summary: `Say the 10 phrases you need most when you visit a place that speaks ${lang.name}, then practise them in real situations.`,
    units: UNITS.map((u) => ({
      title: u.title,
      emoji: u.emoji,
      description: u.description,
      lessons: u.lessons.map((l) => ({
        title: l.title,
        emoji: l.emoji,
        teach: [l.tip],
        // New phrases are taught once; review lessons recap them as cards before the questions
        phrases: l.idx.map(phrase),
        exercises: exercisesFor(l.idx, l.style),
      })),
    })),
  }
  return normalizeCourse(raw, { kind: 'language', label: languageLabel(lang) }, 'offline')
}
