import type { Course } from '../types'

export interface Category {
  id: string
  label: string
  emoji: string
}

const CATS = {
  languages: { id: 'languages', label: 'Languages', emoji: '🗣️' },
  youtube: { id: 'youtube', label: 'YouTube', emoji: '🎬' },
  sales: { id: 'sales', label: 'Sales', emoji: '💰' },
  marketing: { id: 'marketing', label: 'Marketing', emoji: '📣' },
  design: { id: 'design', label: 'Design', emoji: '🎨' },
  gaming: { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  tech: { id: 'tech', label: 'Tech', emoji: '💻' },
  finance: { id: 'finance', label: 'Finance', emoji: '📈' },
  health: { id: 'health', label: 'Health', emoji: '💪' },
  business: { id: 'business', label: 'Business', emoji: '💼' },
  science: { id: 'science', label: 'Science', emoji: '🔬' },
  general: { id: 'general', label: 'General', emoji: '📚' },
} satisfies Record<string, Category>

/** Order matters: the first rule that matches wins */
const RULES: { cat: Category; re: RegExp }[] = [
  { cat: CATS.languages, re: /\b(german|french|spanish|italian|portuguese|japanese|korean|mandarin|chinese|arabic|dutch|swedish|polish|russian|turkish|greek|hindi|language|phrases|vocabulary|travellers|travelers)\b/i },
  { cat: CATS.youtube, re: /\b(youtube|youtuber|mrbeast|vlog|vlogging|thumbnails?|video creators?|content creators?|channel growth)\b/i },
  { cat: CATS.sales, re: /\b(sales|selling|sell|leads?|closing|pipeline|prospecting|negotiat\w*|cold calls?|upsell\w*)\b/i },
  { cat: CATS.marketing, re: /\b(marketing|seo|brand\w*|advertis\w*|social media|copywriting|campaigns?|audiences?|newsletters?|email marketing)\b/i },
  { cat: CATS.design, re: /\b(design|designer|ui|ux|figma|typography|layouts?|wireframes?|prototyp\w*|illustration)\b/i },
  { cat: CATS.gaming, re: /\b(gta|games?|gaming|playstation|xbox|nintendo|minecraft|fortnite|esports?)\b/i },
  { cat: CATS.tech, re: /\b(coding|code|programming|software|javascript|typescript|python|react|ai|machine learning|cyber\w*|data|cloud|api|developer|computers?|technology)\b/i },
  { cat: CATS.finance, re: /\b(invest\w*|finance|financial|money|stocks?|budget\w*|tax|taxes|crypto\w*|pension|savings|mortgage)\b/i },
  { cat: CATS.health, re: /\b(health|fitness|nutrition|sleep|mental|workouts?|exercise|diet|yoga|wellbeing)\b/i },
  { cat: CATS.business, re: /\b(business|startups?|management|managing|leadership|strategy|productivity|entrepreneur\w*|operations)\b/i },
  { cat: CATS.science, re: /\b(science|physics|chemistry|biology|astronomy|space|history|geography|maths?|mathematics|psychology)\b/i },
]

const OVERRIDES = Object.values(CATS)

/** Groups a course under a general heading. The title decides first, then the summary and unit names. */
export function categoryOf(course: Course): Category {
  if (course.category) {
    const known = OVERRIDES.find((c) => c.id === course.category!.toLowerCase())
    if (known) return known
  }
  if (course.lang || course.source?.kind === 'language') return CATS.languages
  const title = course.title ?? ''
  for (const r of RULES) if (r.re.test(title)) return r.cat
  const rest = [course.summary, ...course.units.map((u) => u.title)].join(' ')
  for (const r of RULES) if (r.re.test(rest)) return r.cat
  return CATS.general
}

export function categoryById(id: string | undefined): Category | undefined {
  return OVERRIDES.find((c) => c.id === id)
}

/** Categories in use, biggest first, then alphabetical */
export function groupByCategory(courses: Course[]): { category: Category; courses: Course[] }[] {
  const map = new Map<string, { category: Category; courses: Course[] }>()
  for (const c of courses) {
    const category = categoryOf(c)
    const g = map.get(category.id) ?? { category, courses: [] }
    g.courses.push(c)
    map.set(category.id, g)
  }
  return [...map.values()].sort((a, b) => b.courses.length - a.courses.length || a.category.label.localeCompare(b.category.label))
}
