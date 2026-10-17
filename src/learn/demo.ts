import type { Course } from './types'

/** Hand-written starter course so the app is fun before anything is uploaded */
export const DEMO_COURSE: Course = {
  id: 'demo-solar-system',
  title: 'The Solar System',
  emoji: '🪐',
  summary: 'A quick tour of the Sun, the planets and what makes each one odd.',
  source: { kind: 'demo', label: 'Starter course' },
  generator: 'demo',
  createdAt: '2026-10-17T00:00:00.000Z',
  units: [
    {
      id: 'demo-u1',
      title: 'Unit 1: Meet the neighbours',
      description: 'The Sun and the rocky inner planets',
      lessons: [
        {
          id: 'demo-l1',
          title: 'The Sun',
          teach: [
            'The Sun is a star. It holds more than 99% of all the mass in the Solar System.',
            'It shines by nuclear fusion: hydrogen is squeezed into helium in its core, releasing huge amounts of energy.',
            'Sunlight takes about 8 minutes to reach Earth.',
          ],
          exercises: [
            { type: 'mcq', prompt: 'What kind of object is the Sun?', options: ['A planet', 'A star', 'A moon', 'A comet'], answer: 1, explanation: 'The Sun is a star, the closest one to Earth.' },
            { type: 'cloze', sentence: 'The Sun turns hydrogen into ___ in its core.', answer: 'helium', distractors: ['oxygen', 'carbon', 'iron'], explanation: 'Nuclear fusion joins hydrogen nuclei to make helium.' },
            { type: 'tf', statement: 'Sunlight reaches Earth in about 8 minutes.', answer: true, explanation: 'It is roughly 8 minutes and 20 seconds.' },
            { type: 'tf', statement: 'The planets together hold more mass than the Sun.', answer: false, explanation: 'The Sun has over 99% of the Solar System’s mass.' },
            { type: 'match', prompt: 'Match each word to its meaning', pairs: [
              { left: 'Star', right: 'Makes its own light' },
              { left: 'Fusion', right: 'Joining atoms together' },
              { left: 'Core', right: 'The very centre' },
            ] },
          ],
        },
        {
          id: 'demo-l2',
          title: 'Rocky planets',
          teach: [
            'The four inner planets are Mercury, Venus, Earth and Mars. They are small and made of rock and metal.',
            'Mercury is the closest to the Sun. Venus is the hottest, because its thick carbon dioxide atmosphere traps heat.',
            'Mars looks red because of iron oxide (rust) in its dust.',
          ],
          exercises: [
            { type: 'mcq', prompt: 'Which planet is closest to the Sun?', options: ['Venus', 'Mars', 'Mercury', 'Earth'], answer: 2 },
            { type: 'mcq', prompt: 'Which planet is the hottest?', options: ['Mercury', 'Venus', 'Mars', 'Jupiter'], answer: 1, explanation: 'Venus’s thick atmosphere traps heat, so it beats Mercury.' },
            { type: 'cloze', sentence: 'Mars looks red because of ___ in its dust.', answer: 'rust', distractors: ['lava', 'ice', 'sand'], explanation: 'Iron oxide, better known as rust.' },
            { type: 'tf', statement: 'Earth is one of the four rocky planets.', answer: true },
            { type: 'match', prompt: 'Match the planet to its fact', pairs: [
              { left: 'Mercury', right: 'Closest to the Sun' },
              { left: 'Venus', right: 'Hottest planet' },
              { left: 'Mars', right: 'The red planet' },
              { left: 'Earth', right: 'Has liquid oceans' },
            ] },
          ],
        },
      ],
    },
    {
      id: 'demo-u2',
      title: 'Unit 2: The giants',
      description: 'Gas giants, ice giants and beyond',
      lessons: [
        {
          id: 'demo-l3',
          title: 'Gas giants',
          teach: [
            'Jupiter and Saturn are gas giants, made mostly of hydrogen and helium.',
            'Jupiter is the biggest planet. Its Great Red Spot is a storm larger than Earth.',
            'Saturn has the most famous rings, made of chunks of ice and rock.',
          ],
          exercises: [
            { type: 'mcq', prompt: 'Which is the largest planet?', options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'], answer: 2 },
            { type: 'cloze', sentence: 'Jupiter’s Great Red Spot is a giant ___.', answer: 'storm', distractors: ['crater', 'volcano', 'ocean'] },
            { type: 'tf', statement: 'Saturn’s rings are made of ice and rock.', answer: true },
            { type: 'tf', statement: 'Gas giants have solid rocky surfaces you could stand on.', answer: false, explanation: 'They are mostly gas, with no solid surface like Earth’s.' },
            { type: 'mcq', prompt: 'What are gas giants mostly made of?', options: ['Iron and nickel', 'Hydrogen and helium', 'Water and ice', 'Carbon and oxygen'], answer: 1 },
          ],
        },
        {
          id: 'demo-l4',
          title: 'Ice giants',
          teach: [
            'Uranus and Neptune are ice giants: they contain lots of water, ammonia and methane ices.',
            'Methane in their atmospheres makes them look blue.',
            'Uranus spins on its side, tilted about 98 degrees.',
          ],
          exercises: [
            { type: 'cloze', sentence: 'Uranus and Neptune look blue because of ___ in their air.', answer: 'methane', distractors: ['oxygen', 'helium', 'nitrogen'] },
            { type: 'mcq', prompt: 'Which planet spins on its side?', options: ['Neptune', 'Uranus', 'Saturn', 'Mars'], answer: 1 },
            { type: 'tf', statement: 'Neptune is the farthest planet from the Sun.', answer: true },
            { type: 'match', prompt: 'Match the planet to its type', pairs: [
              { left: 'Jupiter', right: 'Gas giant' },
              { left: 'Neptune', right: 'Ice giant' },
              { left: 'Mars', right: 'Rocky planet' },
            ] },
          ],
        },
      ],
    },
  ],
}
