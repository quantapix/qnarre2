import * as util from '../util';

describe('util', () => {
  it('remove common prefix', () => {
    let result = util.removePrefix([]);
    assert.deepEqual(result, []);
    result = util.removePrefix(['a', 'b', 'c']);
    assert.deepEqual(result, ['a', 'b', 'c']);
    result = util.removePrefix(['a/b', '', 'a/c']);
    assert.deepEqual(result, ['a/b', '', 'a/c']);
    result = util.removePrefix(['a/b/c']);
    assert.deepEqual(result, ['a/b/c']);
    result = util.removePrefix(['q/w/a', 'q/w/b', 'q/w/c/f']);
    assert.deepEqual(result, ['a', 'b', 'c/f']);
    result = util.removePrefix(['q/w/', 'q/w/b', 'q/w/c/f']);
    assert.deepEqual(result, ['q/w/', 'q/w/b', 'q/w/c/f']);
  });
});
