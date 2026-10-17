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

const UNITS = [
  {
    title: 'Unit 1: Be polite',
    emoji: '🙂',
    description: 'Greet people and say thanks.',
    lessons: [
      { title: 'Hello and goodbye', emoji: '👋', idx: [0, 1], tip: 'Say hello when you walk into a shop or cafe. Locals notice it.' },
      { title: 'Please and thank you', emoji: '🙏', idx: [2, 3], tip: 'Politeness goes a long way. Use these every time you ask for something.' },
      { title: 'Yes and no', emoji: '👍', idx: [4, 5], tip: 'Short answers help when someone asks you a question.' },
    ],
  },
  {
    title: 'Unit 2: Get by',
    emoji: '🧭',
    description: 'Ask for help and find your way.',
    lessons: [
      { title: 'Excuse me', emoji: '🙋', idx: [6, 7], tip: 'Start with "excuse me" to get attention, then ask if they speak English.' },
      { title: 'Prices and toilets', emoji: '🚻', idx: [8, 9], tip: 'Point at what you want, then ask the price. Learn the toilet phrase before you need it!' },
    ],
  },
]

export function languageLabel(lang: Language): string {
  return `${lang.name} for travellers`
}

/** Builds a ready made 10 phrase course, with no AI and no file to import */
export function buildLanguageCourse(lang: Language): Course {
  const show = (i: number) => (lang.latin ? lang.entries[i][0] : `${lang.entries[i][0]} (${lang.entries[i][1]})`)
  // Wrong answers come from the other phrases, picked the same way every time
  const others = (i: number, n: number) => Array.from({ length: n }, (_, k) => (i + 3 + k * 2) % 10)

  const raw = {
    title: languageLabel(lang),
    emoji: lang.flag,
    lang: lang.lang,
    summary: `Say the 10 phrases you need most when you visit a place that speaks ${lang.name}.`,
    units: UNITS.map((u) => ({
      title: u.title,
      emoji: u.emoji,
      description: u.description,
      lessons: u.lessons.map((l) => {
        const [a, b] = l.idx
        const [wrong] = others(a, 1)
        return {
          title: l.title,
          emoji: l.emoji,
          teach: [l.tip],
          phrases: l.idx.map((i) => ({ text: lang.entries[i][0], say: lang.entries[i][1], meaning: MEANINGS[i] })),
          exercises: [
            { type: 'mcq', prompt: `What does ${show(a)} mean?`, options: [a, ...others(a, 3)].map((i) => MEANINGS[i]), answer: 0, explanation: `${show(a)} means "${MEANINGS[a]}".` },
            { type: 'mcq', prompt: 'Listen. What does it mean?', audio: lang.entries[b][0], options: [b, ...others(b, 3)].map((i) => MEANINGS[i]), answer: 0, explanation: `You heard ${show(b)}, which means "${MEANINGS[b]}".` },
            { type: 'mcq', prompt: `How do you say "${MEANINGS[a]}" in ${lang.name}?`, options: [a, ...others(a, 3)].map(show), answer: 0, explanation: `"${MEANINGS[a]}" is ${show(a)}.` },
            { type: 'tf', statement: `${show(b)} means "${MEANINGS[b]}".`, answer: true, explanation: `Yes, ${show(b)} means "${MEANINGS[b]}".` },
            { type: 'tf', statement: `${show(a)} means "${MEANINGS[wrong]}".`, answer: false, explanation: `It actually means "${MEANINGS[a]}".` },
            { type: 'cloze', sentence: `In ${lang.name}, "${MEANINGS[b]}" is ___.`, answer: show(b), distractors: others(b, 3).map(show), explanation: `"${MEANINGS[b]}" is ${show(b)}.` },
            { type: 'match', prompt: 'Match the pairs', pairs: [a, b, ...others(a, 2)].map((i) => ({ left: MEANINGS[i], right: show(i) })) },
          ],
        }
      }),
    })),
  }
  return normalizeCourse(raw, { kind: 'language', label: languageLabel(lang) }, 'offline')
}
