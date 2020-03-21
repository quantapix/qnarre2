import * as categ_utils from '../category';

describe('categorizationUtils', () => {
  const {CategoryType} = categ_utils;

  describe('categorizeByPrefix', () => {
    const {categorizeByPrefix} = categ_utils;
    const metadata = {type: CategoryType.PREFIX_GROUP};

    it('returns empty array on empty tags', () => {
      assert.lengthOf(categorizeByPrefix([]), 0);
    });

    it('handles the singleton case', () => {
      const input = ['a'];
      const actual = categorizeByPrefix(input);
      const expected = [
        {
          name: 'a',
          metadata,
          items: ['a']
        }
      ];
      assert.deepEqual(categorizeByPrefix(input), expected);
    });

    it('handles a simple case', () => {
      const input = [
        'foo1/bar',
        'foo1/zod',
        'foo2/bar',
        'foo2/zod',
        'gosh/lod/mar',
        'gosh/lod/ned'
      ];
      const actual = categorizeByPrefix(input);
      const expected = [
        {name: 'foo1', metadata, items: ['foo1/bar', 'foo1/zod']},
        {name: 'foo2', metadata, items: ['foo2/bar', 'foo2/zod']},
        {name: 'gosh', metadata, items: ['gosh/lod/mar', 'gosh/lod/ned']}
      ];
      assert.deepEqual(actual, expected);
    });

    it('presents categories in first-occurrence order', () => {
      const input = ['e', 'f/1', 'g', 'a', 'f/2', 'b', 'c'];
      const actual = categorizeByPrefix(input);
      const expected = [
        {name: 'e', metadata, items: ['e']},
        {name: 'f', metadata, items: ['f/1', 'f/2']},
        {name: 'g', metadata, items: ['g']},
        {name: 'a', metadata, items: ['a']},
        {name: 'b', metadata, items: ['b']},
        {name: 'c', metadata, items: ['c']}
      ];
      assert.deepEqual(actual, expected);
    });

    it('handles cases where category names overlap item names', () => {
      const input = ['a', 'a/a', 'a/b', 'a/c', 'b', 'b/a'];
      const actual = categorizeByPrefix(input);
      const expected = [
        {name: 'a', metadata, items: ['a', 'a/a', 'a/b', 'a/c']},
        {name: 'b', metadata, items: ['b', 'b/a']}
      ];
      assert.deepEqual(actual, expected);
    });
  });

  describe('categorizeBySearchQuery', () => {
    const {categorizeBySearchQuery} = categ_utils;
    const baseMetadata = {
      type: CategoryType.SEARCH_RESULTS,
      validRegex: true,
      universalRegex: false
    };

    it('properly selects just the items matching the query', () => {
      const query = 'cd';
      const items = ['def', 'cde', 'bcd', 'abc'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: baseMetadata,
        items: ['cde', 'bcd']
      };
      assert.deepEqual(actual, expected);
    });

    it('treats the query as a regular expression', () => {
      const query = 'ba(?:na){2,}s';
      const items = ['apples', 'bananas', 'pears', 'more bananananas more fun'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: baseMetadata,
        items: ['bananas', 'more bananananas more fun']
      };
      assert.deepEqual(actual, expected);
    });

    it('yields an empty category when there are no items', () => {
      const query = 'ba(?:na){2,}s';
      const items = [];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {name: query, metadata: baseMetadata, items: []};
      assert.deepEqual(actual, expected);
    });

    it('yields a universal category when the query is empty', () => {
      const query = '';
      const items = ['apples', 'bananas', 'pears', 'bananananas'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {name: query, metadata: baseMetadata, items};
      assert.deepEqual(actual, expected);
    });

    it('notes when the query is invalid', () => {
      const query = ')))';
      const items = ['abc', 'bar', 'zod'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: {...baseMetadata, validRegex: false},
        items: []
      };
      assert.deepEqual(actual, expected);
    });

    it('notes when the query is ".*"', () => {
      const query = '.*';
      const items = ['abc', 'bar', 'zod'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: {...baseMetadata, universalRegex: true},
        items
      };
      assert.deepEqual(actual, expected);
    });
  });

  describe('categorize', () => {
    const {categorize} = categ_utils;

    it('merges the results of the query and the prefix groups', () => {
      const query = 'ba(?:na){2,}s';
      const items = [
        'vegetable/asparagus',
        'vegetable/broccoli',
        'fruit/apples',
        'fruit/bananas',
        'fruit/bananananas',
        'fruit/pears',
        'singleton'
      ];
      const actual = categorize(items, query);
      const expected = [
        {
          name: query,
          metadata: {
            type: CategoryType.SEARCH_RESULTS,
            validRegex: true,
            universalRegex: false
          },
          items: ['fruit/bananas', 'fruit/bananananas']
        },
        {
          name: 'vegetable',
          metadata: {type: CategoryType.PREFIX_GROUP},
          items: ['vegetable/asparagus', 'vegetable/broccoli']
        },
        {
          name: 'fruit',
          metadata: {type: CategoryType.PREFIX_GROUP},
          items: [
            'fruit/apples',
            'fruit/bananas',
            'fruit/bananananas',
            'fruit/pears'
          ]
        },
        {
          name: 'singleton',
          metadata: {type: CategoryType.PREFIX_GROUP},
          items: ['singleton']
        }
      ];
      assert.deepEqual(actual, expected);
    });
  });
});
