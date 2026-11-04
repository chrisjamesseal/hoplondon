/** A daily repeating calendar event, so the phone does the reminding */
export function reminderIcs(time: string, url: string): string {
  const [h, m] = time.split(':').map((n) => String(Number(n) || 0).padStart(2, '0'))
  const now = new Date()
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leap//Daily reminder//EN',
    'BEGIN:VEVENT',
    `UID:leap-daily-reminder@${new URL(url).host}`,
    `DTSTAMP:${day}T000000Z`,
    `DTSTART:${day}T${h}${m}00`,
    `DTEND:${day}T${h}${m}00`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:🐸 Time for your Leap lesson',
    `DESCRIPTION:Two minutes keeps your streak alive. ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Leap lesson',
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
