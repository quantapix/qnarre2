/*
 * common.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import * as assert from 'assert';

import { computeCompletionSimilarity } from '../utils/strings';
import {
  doesRangeContain,
  doRangesOverlap,
  Range,
  rangesAreEqual,
  TextRange,
} from '../utils/text';

test('textRange create', () => {
  assert.throws(() => TextRange.create(-1, 1), Error);
  assert.throws(() => TextRange.create(1, -1), Error);
});

test('textRange from bounds', () => {
  assert.throws(() => TextRange.fromBounds(-1, 1), Error);
  assert.throws(() => TextRange.fromBounds(1, -1), Error);
});

test('textRange overlap', () => {
  const textRangeOne: Range = {
    start: {
      line: 0,
      character: 0,
    },
    end: {
      line: 10,
      character: 0,
    },
  };

  const textRangeTwo: Range = {
    start: {
      line: 11,
      character: 0,
    },
    end: {
      line: 20,
      character: 0,
    },
  };

  const textRangeThree: Range = {
    start: {
      line: 5,
      character: 0,
    },
    end: {
      line: 15,
      character: 0,
    },
  };

  assert.equal(doRangesOverlap(textRangeOne, textRangeTwo), false);
  assert.equal(doRangesOverlap(textRangeTwo, textRangeOne), false);
  assert.equal(doRangesOverlap(textRangeOne, textRangeThree), true);
});

test('textRange contain', () => {
  const textRangeOne: Range = {
    start: {
      line: 0,
      character: 5,
    },
    end: {
      line: 10,
      character: 1,
    },
  };

  assert.equal(doesRangeContain(textRangeOne, { line: 0, character: 0 }), false);
  assert.equal(doesRangeContain(textRangeOne, { line: 0, character: 5 }), true);
  assert.equal(doesRangeContain(textRangeOne, { line: 5, character: 0 }), true);
  assert.equal(doesRangeContain(textRangeOne, { line: 10, character: 0 }), true);
  assert.equal(doesRangeContain(textRangeOne, { line: 10, character: 1 }), true);
  assert.equal(doesRangeContain(textRangeOne, { line: 10, character: 2 }), false);
});

test('textRange equal', () => {
  const textRangeOne: Range = {
    start: {
      line: 0,
      character: 0,
    },
    end: {
      line: 10,
      character: 0,
    },
  };

  const textRangeTwo: Range = {
    start: {
      line: 0,
      character: 0,
    },
    end: {
      line: 10,
      character: 0,
    },
  };

  const textRangeThree: Range = {
    start: {
      line: 5,
      character: 0,
    },
    end: {
      line: 15,
      character: 0,
    },
  };

  assert.equal(rangesAreEqual(textRangeOne, textRangeTwo), true);
  assert.equal(rangesAreEqual(textRangeTwo, textRangeOne), true);
  assert.equal(rangesAreEqual(textRangeOne, textRangeThree), false);
});

test('stringUtils computeCompletionSimilarity', () => {
  assert.equal(computeCompletionSimilarity('', 'abcd'), 1);

  assert.equal(computeCompletionSimilarity('abcd', 'abcd'), 1);
  assert.equal(computeCompletionSimilarity('abc', 'abcd'), 1);

  assert.equal(computeCompletionSimilarity('ABCD', 'abcd'), 0.75);
  assert.equal(computeCompletionSimilarity('ABC', 'abcd'), 0.75);

  assert.equal(computeCompletionSimilarity('abce', 'abcd'), 0.375);
  assert.equal(computeCompletionSimilarity('abcde', 'abcd'), 0.4);
  assert.equal(computeCompletionSimilarity('azcde', 'abcd'), 0.3);
  assert.equal(computeCompletionSimilarity('acde', 'abcd'), 0.25);
  assert.equal(computeCompletionSimilarity('zbcd', 'abcd'), 0.375);
});
