# Leap · learn anything

A Duolingo-style learning app. Live at **https://chrisjamesseal.github.io/Leap/**

Give it a source and it builds a course of units and lessons:

- **Upload a PDF** (notes, a textbook chapter, a report)
- **Type a topic** ("How vaccines work")
- **Paste a link** (an article or wiki page)

### Gamification

- Winding lesson path, units unlock in order, crowns 👑 for perfect lessons
- Progress bars everywhere: course, unit, lesson, daily goal, level, achievements
- XP, levels, daily streak 🔥, daily XP goal and a weekly XP chart
- Hearts ❤️: lose one per mistake, regain one every 30 minutes, or practise to refill
- Mistakes come back at the end of the lesson until you get them right
- Exercise types: multiple choice, true/false, fill the gap with word tiles, match pairs
- Sounds, confetti, keyboard shortcuts (1 to 4 to pick, Enter to check)

### How lessons are made

- **With Claude**: Leap writes a prompt for your topic, link or PDF. Open it in the Claude
  app, Claude makes a `leap-course.json` file, and you upload it (or paste the JSON) back
  into Leap. Code: `src/learn/lib/claudePrompt.ts`.
- **Quick**: text is pulled out in the browser (pdf.js for PDFs, the Wikipedia API for
  topics, a reader proxy for links) and turned into exercises from key terms and
  sentences. Code: `src/learn/lib/offlineGen.ts`.

Everything (courses and progress) is stored in your browser only.

Code lives in `src/learn/`; the entry page is `index.html`.

## Running it locally

```bash
npm install
npm run dev
npm test
```
