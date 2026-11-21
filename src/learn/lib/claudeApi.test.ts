import { describe, expect, it } from 'vitest'
import { costOf, textFromSse } from './claudeApi'

describe('textFromSse', () => {
  it('collects text deltas', () => {
    const chunk = 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"{\\"a\\""}}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":":1}"}}\n'
    expect(textFromSse(chunk).text).toBe('{"a":1}')
  })
  it('reports stream errors', () => {
    expect(textFromSse('data: {"type":"error","error":{"message":"Overloaded"}}').error).toBe('Overloaded')
  })
  it('reads token counts for the cost', () => {
    const chunk = 'data: {"type":"message_start","message":{"usage":{"input_tokens":1000,"output_tokens":1}}}\ndata: {"type":"message_delta","usage":{"output_tokens":2000}}'
    const r = textFromSse(chunk)
    expect(r).toMatchObject({ input: 1000, output: 2000 })
    expect(costOf({ input: 1000, output: 2000 })).toBeCloseTo(0.022)
  })
})
