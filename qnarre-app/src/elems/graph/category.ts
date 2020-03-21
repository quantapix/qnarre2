import * as vz_sorting from 'vz_sorting';

import * as qb from './backend';

export type RunToTag = {[run: string]: string[]};

export enum CategoryType {
  SEARCH_RESULTS,
  PREFIX_GROUP
}
export interface PrefixGroupMetadata {
  type: CategoryType;
}
export interface SearchResultsMetadata {
  type: CategoryType;
  compositeSearch?: boolean;
  validRegex: boolean;
  universalRegex: boolean; // is the search query ".*"? ("(?:)" doesn't count)
}
export type CategoryMetadata = PrefixGroupMetadata | SearchResultsMetadata;

export interface Category<T> {
  name: string;
  metadata: CategoryMetadata;
  items: T[];
}
export type TagCategory = Category<{tag: string; runs: string[]}>;
export type RunTagCategory = Category<{tag: string; run: string}>;

export type Series = {
  experiment: qb.Experiment;
  run: string;
  tag: string;
};

export type SeriesCategory = Category<{
  tag: string;
  series: Series[];
}>;

export type RawCategory = Category<string>; // Intermediate structure.

export function categorizeBySearchQuery(
  xs: string[],
  query: string
): RawCategory {
  const re = (() => {
    try {
      return new RegExp(query);
    } catch (e) {
      return null;
    }
  })();
  return {
    name: query,
    metadata: {
      type: CategoryType.SEARCH_RESULTS,
      validRegex: !!re,
      universalRegex: query === '.*'
    },
    items: re ? xs.filter(x => x.match(re)) : []
  };
}

export function categorizeByPrefix(
  xs: string[],
  separator = '/'
): RawCategory[] {
  const categories = [];
  const categoriesByName = {};
  xs.forEach(x => {
    const index = x.indexOf(separator);
    const name = index >= 0 ? x.slice(0, index) : x;
    if (!categoriesByName[name]) {
      const category = {
        name,
        metadata: {type: CategoryType.PREFIX_GROUP},
        items: []
      };
      categoriesByName[name] = category;
      categories.push(category);
    }
    categoriesByName[name].items.push(x);
  });
  return categories;
}

export function categorize(xs: string[], query = ''): RawCategory[] {
  const byFilter = [categorizeBySearchQuery(xs, query)];
  const byPrefix = categorizeByPrefix(xs);
  return [].concat(byFilter, byPrefix);
}

export function categorizeTags(
  runToTag: RunToTag,
  selectedRuns: string[],
  query?: string
): TagCategory[] {
  const tags = qb.getTags(runToTag);
  const categories = categorize(tags, query);
  const tagToRuns = createTagToRuns(_.pick(runToTag, selectedRuns));

  return categories.map(({name, metadata, items}) => ({
    name,
    metadata,
    items: items.map(tag => ({
      tag,
      runs: (tagToRuns.get(tag) || []).slice()
    }))
  }));
}

function createTagToRuns(runToTag: RunToTag): Map<string, string[]> {
  const tagToRun = new Map();
  Object.keys(runToTag).forEach(run => {
    runToTag[run].forEach(tag => {
      const runs = tagToRun.get(tag) || [];
      runs.push(run);
      tagToRun.set(tag, runs);
    });
  });
  return tagToRun;
}

function createRunToTagForPlugin(runs: qb.Run[], pluginName: string): RunToTag {
  const runToTag = {};
  runs.forEach(run => {
    runToTag[run.name] = run.tags
      .filter(tag => tag.pluginName == pluginName)
      .map(({name}) => name);
  });
  return runToTag;
}

function compareTagRun(a, b: {tag: string; run: string}): number {
  const c = vz_sorting.compareTagNames(a.tag, b.tag);
  if (c != 0) {
    return c;
  }
  return vz_sorting.compareTagNames(a.run, b.run);
}

export function categorizeRunTagCombinations(
  runToTag: RunToTag,
  selectedRuns: string[],
  query?: string
): RunTagCategory[] {
  const tagCategories = categorizeTags(runToTag, selectedRuns, query);
  function explodeCategory(tagCategory: TagCategory): RunTagCategory {
    const items = _.flatten(
      tagCategory.items.map(({tag, runs}) => runs.map(run => ({tag, run})))
    );
    items.sort(compareTagRun);
    return {
      name: tagCategory.name,
      metadata: tagCategory.metadata,
      items
    };
  }
  return tagCategories.map(explodeCategory);
}
