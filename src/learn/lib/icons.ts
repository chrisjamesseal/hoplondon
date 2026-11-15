import {
  Atom, BookOpen, Brain, Building2, Camera, ChartColumn, Clapperboard, Clock, Code, Coffee, Compass, Cpu, Crown, FlaskConical, Flag, Gamepad2, Gift, Globe,
  GraduationCap, Handshake, Headphones, Heart, Landmark, Leaf, Lightbulb, Link, LifeBuoy, Mail, Map, Megaphone, MessageCircle, Moon, Music, Palette, PenLine, Phone,
  Plane, Puzzle, Rocket, Scale, Search, Settings, Shield, ShoppingBag, Sparkles, Sprout, Star, Sun, Target, TrainFront, TrendingUp, Trophy, Users, Utensils,
  Wallet, Wrench, Zap, type LucideIcon,
} from 'lucide-react'

/** Words in a title that point at a picture, most specific first */
const BY_WORD: [RegExp, LucideIcon][] = [
  [/launch|rocket|space|orbit|planet|solar|star\b|sun\b/, Rocket],
  [/handshake|negotiat|deal|close|closing|pitch|partner|agreement/, Handshake],
  [/objection|risk|security|protect|safe|defen|privacy/, Shield],
  [/solution|problem|puzzle|diagnos|troubleshoot|fix/, Puzzle],
  [/discover|search|research|find|investigat|audit|qualif|lead/, Search],
  [/goal|target|aim|focus|strategy|plan(?!et)|objective/, Target],
  [/price|pricing|money|cost|budget|financ|invest|revenue|profit|bill|pay|sales|sell/, Wallet],
  [/metric|analytic|data|chart|report|stat|growth|trend|result|perform/, TrendingUp],
  [/email|mail|outreach|newsletter|letter/, Mail],
  [/phone|call|ring/, Phone],
  [/video|youtube|film|movie|clip|stream|thumbnail|edit/, Clapperboard],
  [/idea|creative|inspir|innovat|think|concept/, Lightbulb],
  [/brain|memory|mind|psycholog|habit|learn how|attention|retention|reward/, Brain],
  [/lock|secret/, Shield],
  [/world|global|language|travel|culture|country|international/, Globe],
  [/plane|flight|airport|airline/, Plane],
  [/station|train|rail|transport|bus|metro|commut|getting around/, TrainFront],
  [/food|cook|eat|meal|recipe|restaurant|menu|kitchen|nutrition/, Utensils],
  [/coffee|café|cafe|tea\b/, Coffee],
  [/market|shop|store|retail|buy|e-?commerce|checkout/, ShoppingBag],
  [/code|program|software|develop|website|web|app\b|script/, Code],
  [/ai\b|machine|model|algorithm|computer|tech|digital|chip/, Cpu],
  [/science|chemi|lab|experiment|biolog|medic/, FlaskConical],
  [/atom|physics|quantum|particle|nuclear|fusion/, Atom],
  [/history|ancient|empire|roman|politic|government|law\b|constitution|museum/, Landmark],
  [/legal|contract|justice|ethic|fair|balance/, Scale],
  [/music|song|audio|sound|podcast|listen|ear\b|hear/, Headphones],
  [/speak|talk|conversation|say|phrase|word|dialogue|presenting|presentation|communicat|message/, MessageCircle],
  [/team|people|customer|client|audience|community|group|social|network|relationship/, Users],
  [/time|clock|schedule|deadline|routine|daily|hour/, Clock],
  [/energy|power|electric|fast|speed|quick/, Zap],
  [/sun|solar|light|day/, Sun],
  [/night|sleep|moon|rest|dream/, Moon],
  [/nature|plant|climate|environment|green|garden|tree|eco/, Leaf],
  [/grow|seed|sprout|foundation|basic|intro|begin|start/, Sprout],
  [/compass|direction|navigat|guide|journey|where/, Compass],
  [/map|route|path|location|geograph|place/, Map],
  [/help|emergency|trouble|rescue|support|assist|wrong/, LifeBuoy],
  [/flag|country|nation/, Flag],
  [/write|writing|essay|copy|note|journal|blog/, PenLine],
  [/graduat|study|exam|school|course|degree|education|teach/, GraduationCap],
  [/photo|camera|picture|image|visual/, Camera],
  [/design|art|colour|color|paint|style|brand/, Palette],
  [/tool|repair|build|maker|craft|practical|improve/, Wrench],
  [/market|advert|promot|campaign|publicity|megaphone|announce/, Megaphone],
  [/link|connect|referral|backlink/, Link],
  [/process|system|workflow|setting|automat|operat|manage/, Settings],
  [/heart|health|care|wellbeing|love|emotion|stress|fitness|exercise/, Heart],
  [/game|play|fun|quiz|challenge/, Gamepad2],
  [/company|business|enterprise|organi[sz]ation|office|corporate|b2b/, Building2],
  [/gift|bonus|offer|free|reward/, Gift],
  [/win|champion|best|mastery|master|final|trophy/, Trophy],
  [/read|book|story|guide|chapter|theory|principle|concept|fundamental/, BookOpen],
  [/quality|rating|review|feedback|top/, Star],
  [/crown|king|leader|lead\b/, Crown],
]

/** The emoji a course already carries, mapped to the same set of pictures */
const BY_EMOJI: Record<string, LucideIcon> = {
  '🌱': Sprout, '🧭': Compass, '🤝': Handshake, '📈': TrendingUp, '🏆': Trophy, '🧩': Puzzle, '🎯': Target, '🔍': Search, '✉️': Mail, '💰': Wallet,
  '📊': ChartColumn, '💡': Lightbulb, '📚': BookOpen, '📖': BookOpen, '🧠': Brain, '🌍': Globe, '🌎': Globe, '✈️': Plane, '🍳': Utensils, '☕': Coffee,
  '🛍️': ShoppingBag, '🚆': TrainFront, '🧪': FlaskConical, '⚛️': Atom, '🏛️': Landmark, '⚖️': Scale, '🎧': Headphones, '🎵': Music, '🗣️': MessageCircle,
  '👥': Users, '⏰': Clock, '🚀': Rocket, '⭐': Star, '🔒': Shield, '⚙️': Settings, '🗺️': Map, '🍃': Leaf, '🌿': Leaf, '☀️': Sun, '🌙': Moon,
  '🆘': LifeBuoy, '🧯': LifeBuoy, '🎬': Clapperboard, '📞': Phone, '📣': Megaphone, '🎨': Palette, '📷': Camera, '🎓': GraduationCap, '🔧': Wrench,
  '🎁': Gift, '🎮': Gamepad2, '💼': Building2, '❤️': Heart, '🔗': Link, '✍️': PenLine, '🏁': Flag, '🧐': Search, '🙏': Heart, '👋': Handshake, '🔀': Sparkles,
}

// Every pattern must start at the beginning of a word, so "planets" is never read as "plan"
for (const rule of BY_WORD) rule[0] = new RegExp(`\\b(?:${rule[0].source})`)

const FALLBACK: LucideIcon[] = [BookOpen, Lightbulb, Sparkles, Compass, Star, Target]

/** One simple line icon for a lesson or unit, in a single colour so it can never clash with what it sits on */
export function iconFor(title: string, emoji: string | undefined, index = 0, extra = ''): LucideIcon {
  // The title decides first; the longer description is only a second chance
  for (const text of [title.toLowerCase(), extra.toLowerCase()]) for (const [re, icon] of BY_WORD) if (re.test(text)) return icon
  const e = (emoji ?? '').replace(/️/g, '')
  const hit = BY_EMOJI[emoji ?? ''] ?? Object.entries(BY_EMOJI).find(([k]) => k.replace(/️/g, '') === e)?.[1]
  return hit ?? FALLBACK[index % FALLBACK.length]
}

export { Crown, Trophy }
