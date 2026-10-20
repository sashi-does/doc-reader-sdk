import { describe, it, expect } from 'vitest';
import { truncate } from '../src/utils/helpers.js';

describe('truncate', () => {
  it('leaves short text untouched', () => {
    const { text, truncated } = truncate('hello', 100);
    expect(text).toBe('hello');
    expect(truncated).toBe(false);
  });

  it('leaves text untouched when maxChars is not set', () => {
    const { text, truncated } = truncate('hello world');
    expect(text).toBe('hello world');
    expect(truncated).toBe(false);
  });

  it('cuts text at maxChars and marks it truncated', () => {
    const { text, truncated } = truncate('hello world', 5);
    expect(text.startsWith('hello')).toBe(true);
    expect(text).toContain('truncated');
    expect(truncated).toBe(true);
  });
});
