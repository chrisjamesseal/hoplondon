import type { Course } from './types'

/** Hand-written starter course so the app is useful before anything is uploaded */
export const DEMO_COURSE: Course = {
  id: 'demo-solar-system',
  title: 'The Solar System',
  emoji: '🪐',
  summary: 'Understand how the Sun and planets work, and spot the myths people still repeat.',
  source: { kind: 'demo', label: 'Starter course' },
  generator: 'demo',
  createdAt: '2026-10-17T00:00:00.000Z',
  units: [
    {
      id: 'demo-u1',
      title: 'Unit 1: The foundations',
      description: 'The Sun and the rocky inner planets',
      lessons: [
        {
          id: 'demo-l1',
          title: 'How the Sun works',
          teach: [
            'The Sun is an ordinary star that holds about 99.8% of all the mass in the Solar System. Everything else, planets included, is a rounding error.',
            'It runs on nuclear fusion: in the core, hydrogen nuclei are forced together into helium, and a small amount of mass becomes energy. That is the same E = mc² idea behind nuclear power.',
            'Light leaving the surface reaches us in about 8 minutes 20 seconds, so you always see the Sun as it was a few minutes ago.',
          ],
          exercises: [
            { type: 'mcq', prompt: 'What actually powers the Sun?', options: ['Burning gas, like a huge fire', 'Nuclear fusion of hydrogen into helium', 'Heat left over from its formation', 'Radioactive decay of heavy metals'], answer: 1, explanation: 'Fusion in the core turns a tiny fraction of mass into energy. Ordinary burning would have run out within a few thousand years.' },
            { type: 'cloze', sentence: 'In the core, hydrogen is fused into ___, releasing energy.', answer: 'helium', distractors: ['oxygen', 'carbon', 'iron'], explanation: 'Four hydrogen nuclei end up as one helium nucleus, which weighs slightly less. The missing mass is released as energy.' },
            { type: 'tf', statement: 'If the Sun suddenly vanished, we would keep seeing it for roughly eight minutes.', answer: true, explanation: 'Its last light would still be on the way to us, about 8 minutes 20 seconds behind.' },
            { type: 'mcq', prompt: 'A friend says summer happens because Earth gets closer to the Sun. What is the better explanation?', options: ['Earth’s tilt means your hemisphere gets more direct sunlight', 'The Sun burns hotter in summer', 'The Moon reflects extra light in summer', 'They are right, distance is the main cause'], answer: 0, explanation: 'Seasons come from Earth’s tilt. Earth is actually closest to the Sun in early January, during the northern winter.' },
            { type: 'tf', statement: 'The planets together hold more mass than the Sun.', answer: false, explanation: 'The Sun has about 99.8% of the Solar System’s mass. Jupiter makes up most of what is left.' },
            { type: 'match', prompt: 'Match each term to its meaning', pairs: [
              { left: 'Fusion', right: 'Light nuclei joining into heavier ones' },
              { left: 'Core', right: 'Where the Sun’s energy is made' },
              { left: 'Light-minute', right: 'Distance light travels in a minute' },
            ] },
          ],
        },
        {
          id: 'demo-l2',
          title: 'The rocky planets',
          teach: [
            'Mercury, Venus, Earth and Mars are small, dense worlds of rock and metal. Their differences come down mostly to their atmospheres.',
            'Venus is the hottest planet at around 465°C, even though Mercury is closer to the Sun. Its thick carbon dioxide atmosphere traps heat: a runaway greenhouse effect.',
            'Mercury has almost no atmosphere, so it swings from about 430°C in daylight to about −180°C at night. Mars is red because its dust is rich in iron oxide, essentially rust.',
          ],
          exercises: [
            { type: 'mcq', prompt: 'Why is Venus hotter than Mercury, despite being further from the Sun?', options: ['Its thick CO₂ atmosphere traps heat', 'It has active volcanoes everywhere', 'It spins much faster', 'It is closer to Jupiter'], answer: 0, explanation: 'A dense carbon dioxide atmosphere creates a runaway greenhouse effect, keeping Venus at around 465°C day and night.' },
            { type: 'cloze', sentence: 'Venus is an extreme example of the runaway ___ effect.', answer: 'greenhouse', distractors: ['Doppler', 'butterfly', 'placebo'], explanation: 'Heat gets in as sunlight but can’t escape through the thick CO₂, so temperatures keep climbing.' },
            { type: 'tf', statement: 'Mercury stays hot all the time because it is closest to the Sun.', answer: false, explanation: 'With almost no atmosphere to hold heat, its night side drops to around −180°C.' },
            { type: 'mcq', prompt: 'What gives Mars its red colour?', options: ['Iron oxide in its dust', 'Reflected light from the Sun', 'Red algae on the surface', 'Molten lava under the crust'], answer: 0, explanation: 'Iron oxide, the same compound as rust, coats much of the Martian surface.' },
            { type: 'tf', statement: 'Earth is one of the four rocky planets.', answer: true, explanation: 'Mercury, Venus, Earth and Mars are the rocky, or terrestrial, planets.' },
            { type: 'match', prompt: 'Match each planet to what defines it', pairs: [
              { left: 'Mercury', right: 'Huge day and night swings' },
              { left: 'Venus', right: 'Runaway greenhouse effect' },
              { left: 'Mars', right: 'Iron oxide dust' },
              { left: 'Earth', right: 'Liquid water on the surface' },
            ] },
          ],
        },
      ],
    },
    {
      id: 'demo-u2',
      title: 'Unit 2: The giants',
      description: 'Gas giants, ice giants and why they look the way they do',
      lessons: [
        {
          id: 'demo-l3',
          title: 'Gas giants',
          teach: [
            'Jupiter and Saturn are made mostly of hydrogen and helium, with no solid surface to stand on. Go deeper and the gas simply gets denser and hotter.',
            'Jupiter has more than twice the mass of all the other planets combined. Its Great Red Spot is a storm wider than Earth that has been watched for well over 150 years.',
            'Saturn is so light for its size that its average density is lower than water. Its rings are mostly chunks of water ice.',
          ],
          exercises: [
            { type: 'mcq', prompt: 'Which statement about Jupiter is true?', options: ['It has more than twice the mass of all other planets combined', 'It has a rocky surface like Earth', 'It is the closest giant planet to the Sun after Saturn', 'Its Great Red Spot is a volcano'], answer: 0, explanation: 'Jupiter dominates the planets by mass. The Great Red Spot is a long-lived storm, not a surface feature.' },
            { type: 'cloze', sentence: 'Jupiter’s Great Red Spot is a long-lived ___.', answer: 'storm', distractors: ['crater', 'volcano', 'ocean'], explanation: 'It is an enormous high-pressure storm system, wider than Earth.' },
            { type: 'tf', statement: 'Saturn’s average density is lower than that of water.', answer: true, explanation: 'Its average density is about 0.7 times that of water, the lowest of any planet.' },
            { type: 'tf', statement: 'You could land a spacecraft on Jupiter’s surface.', answer: false, explanation: 'There is no solid surface. A probe would be crushed by rising pressure long before reaching anything firm.' },
            { type: 'mcq', prompt: 'What are Saturn’s rings mostly made of?', options: ['Water ice', 'Dust from Saturn’s volcanoes', 'Iron and nickel', 'Frozen methane gas'], answer: 0, explanation: 'The rings are billions of pieces of mostly water ice, from tiny grains to chunks the size of houses.' },
          ],
        },
        {
          id: 'demo-l4',
          title: 'Ice giants',
          teach: [
            'Uranus and Neptune are ice giants. Beneath their atmospheres they are rich in water, ammonia and methane, which astronomers call "ices" even when they are hot and dense.',
            'Methane in their upper atmospheres absorbs red light, which is why both look blue.',
            'Uranus is tipped over by about 98 degrees, so it orbits on its side. Each pole gets around 42 years of daylight followed by 42 years of darkness.',
          ],
          exercises: [
            { type: 'cloze', sentence: 'Uranus and Neptune look blue because ___ absorbs red light.', answer: 'methane', distractors: ['oxygen', 'helium', 'nitrogen'], explanation: 'Methane soaks up the red end of sunlight, leaving mostly blue to be reflected back.' },
            { type: 'mcq', prompt: 'What is unusual about Uranus?', options: ['It orbits tipped on its side', 'It has no moons', 'It is hotter than Venus', 'It orbits the Sun backwards'], answer: 0, explanation: 'Its axis is tilted about 98 degrees, possibly after a huge collision early in its history.' },
            { type: 'tf', statement: 'In astronomy, "ices" can include water and ammonia that are actually hot.', answer: true, explanation: 'The word describes what these substances are made of, not their temperature.' },
            { type: 'match', prompt: 'Match each planet to its type', pairs: [
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
