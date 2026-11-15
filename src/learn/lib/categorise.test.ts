import { describe, expect, it } from 'vitest'
import { categoryOf } from './categorise'
import type { Course } from '../types'

const course = (title: string, summary = ''): Course =>
  ({ id: 'c', title, emoji: '📘', summary, source: { kind: 'topic', label: title }, generator: 'claude', createdAt: '', units: [] }) as Course

describe('categoryOf', () => {
  it('files the fall of Rome under history, not general', () => {
    expect(categoryOf(course('The Fall of the Roman Empire')).id).toBe('history')
    expect(categoryOf(course('A Short History of Money')).id).toBe('history')
    expect(categoryOf(course('World War II Explained')).id).toBe('history')
  })
  it('keeps the other headings as they were', () => {
    expect(categoryOf(course('The MrBeast YouTube Playbook')).id).toBe('youtube')
    expect(categoryOf(course('Website Sales: From Lead to Close')).id).toBe('sales')
    expect(categoryOf(course('How the Solar System Works')).id).toBe('science')
    expect(categoryOf(course('Origami for Beginners')).id).toBe('general')
  })
})
