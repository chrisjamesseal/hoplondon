import { describe, expect, it } from 'vitest'
import { textFromSse } from './claudeApi'

describe('textFromSse', () => {
  it('collects text deltas', () => {
    const chunk = 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"{\\"a\\""}}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":":1}"}}\n'
    expect(textFromSse(chunk).text).toBe('{"a":1}')
  })
  it('reports stream errors', () => {
    expect(textFromSse('data: {"type":"error","error":{"message":"Overloaded"}}').error).toBe('Overloaded')
  })
})
