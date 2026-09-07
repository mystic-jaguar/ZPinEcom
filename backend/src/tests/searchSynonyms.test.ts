import { expandToken, tokenize } from '../utils/searchSynonyms';

describe('tokenize', () => {
  it('splits on punctuation and drops 1-char noise', () => {
    expect(tokenize('Blue Cotton Kurta')).toEqual(['blue', 'cotton', 'kurta']);
    expect(tokenize('t-shirt, red')).toEqual(['shirt', 'red']);
  });
});

describe('expandToken', () => {
  it('expands a known term to its synonyms', () => {
    expect(expandToken('saree')).toEqual(expect.arrayContaining(['saree', 'sari']));
  });

  it('corrects a misspelling', () => {
    expect(expandToken('jaket')).toEqual(expect.arrayContaining(['jacket']));
    expect(expandToken('kurtas')).toEqual(expect.arrayContaining(['kurta']));
  });

  it('leaves an unknown word alone so brands still search for themselves', () => {
    expect(expandToken('zpin')).toEqual(['zpin']);
  });

  // The substring rung this replaces expanded "laptop" into blouses/shirts
  // because the phrase contains the synonym key "top".
  it('does not expand a word merely containing a synonym key', () => {
    expect(expandToken('laptop')).toEqual(['laptop']);
    expect(expandToken('important')).toEqual(['important']);
  });

  it('does not confuse short near-neighbours', () => {
    expect(expandToken('shirt')).not.toEqual(expect.arrayContaining(['bermuda']));
  });
});

describe('expandToken — value-only tokens', () => {
  // "shirt" is not a synonym KEY, only a value of the "top"/"t-shirt" groups.
  // Without the reverse index it fell to edit distance and matched "skirt".
  it('resolves a word that only appears as a synonym value', () => {
    const out = expandToken('shirt');
    expect(out).toEqual(expect.arrayContaining(['t-shirt', 'top']));
    expect(out).not.toEqual(expect.arrayContaining(['skirt', 'lehenga']));
  });

  it('resolves sandals across every group that lists it', () => {
    expect(expandToken('sandals')).toEqual(expect.arrayContaining(['chappal', 'slippers']));
  });
});

describe('expandToken — canonical ordering', () => {
  // Callers rank relevance on expansions[0]; a typo must surface the CORRECTED
  // word there, not the misspelling the user typed.
  it('puts the corrected term first for a typo', () => {
    expect(expandToken('kurtaa')[0]).toBe('kurta');
    expect(expandToken('kurtaa')).toContain('kurtaa');
  });

  it('keeps the typed word first when it is already a known term', () => {
    expect(expandToken('saree')[0]).toBe('saree');
  });
});
