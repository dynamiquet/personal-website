import { describe, expect, it } from 'vitest'
import {
  buildOverlapSegments,
  fingerprintBody,
  resolveAnchor,
  truncateQuote,
} from './commentAnchors.js'

describe('commentAnchors helpers', () => {
  it('truncates long quotes to head… tail', () => {
    const quote = 'one two three four five six seven eight nine ten eleven twelve thirteen'
    expect(truncateQuote(quote, 8)).toBe('one two three four… ten eleven twelve thirteen')
    expect(truncateQuote('short quote')).toBe('short quote')
  })

  it('fingerprints body text stably', () => {
    expect(fingerprintBody('abc')).toBe(fingerprintBody('abc'))
    expect(fingerprintBody('abc')).not.toBe(fingerprintBody('abd'))
  })

  it('resolves anchors by exact offsets, then context, then unique quote', () => {
    const text = 'aaa Hello world bbb Hello world ccc'
    const unique = resolveAnchor('prefix UNIQUE_SNIPPET suffix', {
      start: 0,
      end: 5,
      quote: 'UNIQUE_SNIPPET',
      prefix: 'prefix ',
      suffix: ' suffix',
      bodyFingerprint: 'x',
    })
    expect(unique).toEqual({ start: 7, end: 21, quote: 'UNIQUE_SNIPPET' })

    const exact = resolveAnchor(text, {
      start: 4,
      end: 15,
      quote: 'Hello world',
      prefix: 'aaa ',
      suffix: ' bbb',
      bodyFingerprint: 'x',
    })
    expect(exact).toEqual({ start: 4, end: 15, quote: 'Hello world' })

    const ambiguous = resolveAnchor(text, {
      start: 99,
      end: 110,
      quote: 'Hello world',
      prefix: '',
      suffix: '',
      bodyFingerprint: 'x',
    })
    expect(ambiguous).toBeNull()
  })

  it('builds overlapping segments with all covering thread ids', () => {
    const segments = buildOverlapSegments([
      { id: 'a', start: 0, end: 10 },
      { id: 'b', start: 5, end: 15 },
    ], 20)

    expect(segments).toEqual([
      { start: 0, end: 5, threadIds: ['a'] },
      { start: 5, end: 10, threadIds: ['a', 'b'] },
      { start: 10, end: 15, threadIds: ['b'] },
      { start: 15, end: 20, threadIds: [] },
    ])
  })
})
