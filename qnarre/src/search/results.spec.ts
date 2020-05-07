import {DebugElement} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Result, Results} from './types';
import {ResultsComp} from './results';

describe('ResultsComp', () => {
  let c: ResultsComp;
  let f: ComponentFixture<ResultsComp>;
  let guideA: Result;
  let apiD: Result;
  let guideB: Result;
  let guideAC: Result;
  let apiC: Result;
  let guideN: Result;
  let guideM: Result;
  let guideL: Result;
  let guideK: Result;
  let guideJ: Result;
  let guideI: Result;
  let guideH: Result;
  let guideG: Result;
  let guideF: Result;
  let guideE: Result;
  let standardResults: Result[];

  function getText() {
    return f.debugElement.nativeElement.textContent;
  }

  function setResults(query: string, results: Result[]) {
    c.results = {query, results} as Results;
    c.ngOnChanges();
    f.detectChanges();
  }
  beforeEach(() => {
    apiD = {
      path: 'api/d',
      title: 'API D',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    apiC = {
      path: 'api/c',
      title: 'API C',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideA = {
      path: 'guide/a',
      title: 'Guide A',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideB = {
      path: 'guide/b',
      title: 'Guide B',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideAC = {
      path: 'guide/a/c',
      title: 'Guide A - C',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideE = {
      path: 'guide/e',
      title: 'Guide e',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideF = {
      path: 'guide/f',
      title: 'Guide f',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideG = {
      path: 'guide/g',
      title: 'Guide g',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideH = {
      path: 'guide/h',
      title: 'Guide h',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideI = {
      path: 'guide/i',
      title: 'Guide i',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideJ = {
      path: 'guide/j',
      title: 'Guide j',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideK = {
      path: 'guide/k',
      title: 'Guide k',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideL = {
      path: 'guide/l',
      title: 'Guide l',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideM = {
      path: 'guide/m',
      title: 'Guide m',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    guideN = {
      path: 'guide/n',
      title: 'Guide n',
      deprecated: false,
      keywords: '',
      titleWords: '',
      type: ''
    };
    standardResults = [
      guideA,
      apiD,
      guideB,
      guideAC,
      apiC,
      guideN,
      guideM,
      guideL,
      guideK,
      guideJ,
      guideI,
      guideH,
      guideG,
      guideF,
      guideE
    ];
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ResultsComp]
    });
  });

  beforeEach(() => {
    f = TestBed.createComponent(ResultsComp);
    c = f.componentInstance;
    f.detectChanges();
  });
  it('should map the search results into groups based on their containing folder', () => {
    setResults('', [guideA, apiD, guideB]);
    expect(c.areas).toEqual([
      {name: 'api', priority: [apiD], pages: []},
      {name: 'guide', priority: [guideA, guideB], pages: []}
    ]);
  });
  it('should special case results that are top level folders', () => {
    setResults('', [
      {
        path: 'tutorial',
        title: 'Tutorial index',
        type: '',
        keywords: '',
        titleWords: '',
        deprecated: false
      },
      {
        path: 'tutorial/toh-pt1',
        title: 'Tutorial - part 1',
        type: '',
        keywords: '',
        titleWords: '',
        deprecated: false
      }
    ]);
    expect(c.areas).toEqual([
      {
        name: 'tutorial',
        priority: [
          {
            path: 'tutorial',
            title: 'Tutorial index',
            type: '',
            keywords: '',
            titleWords: '',
            deprecated: false
          },
          {
            path: 'tutorial/toh-pt1',
            title: 'Tutorial - part 1',
            type: '',
            keywords: '',
            titleWords: '',
            deprecated: false
          }
        ],
        pages: []
      }
    ]);
  });
  it('should put, at most, the first 5 results for each area into priority, not sorted', () => {
    setResults('', standardResults);
    expect(c.areas[0].priority).toEqual([apiD, apiC]);
    expect(c.areas[1].priority).toEqual([
      guideA,
      guideB,
      guideAC,
      guideN,
      guideM
    ]);
  });
  it('should put the nonPriority into the pages array, sorted by title', () => {
    setResults('', standardResults);
    expect(c.areas[0].pages).toEqual([]);
    expect(c.areas[1].pages).toEqual([
      guideE,
      guideF,
      guideG,
      guideH,
      guideI,
      guideJ,
      guideK,
      guideL
    ]);
  });
  it('should put a total count in the header of each area of search results', () => {
    setResults('', standardResults);
    f.detectChanges();
    const headers = f.debugElement.queryAll(By.css('h3'));
    expect(headers.length).toEqual(2);
    expect(headers[0].nativeElement.textContent).toContain('(2)');
    expect(headers[1].nativeElement.textContent).toContain('(13)');
  });
  it('should put search results with no containing folder into the default area (other)', () => {
    const results = [
      {
        path: 'news',
        title: 'News',
        type: 'marketing',
        keywords: '',
        titleWords: '',
        deprecated: false
      }
    ];
    setResults('', results);
    expect(c.areas).toEqual([
      {
        name: 'other',
        priority: [
          {
            path: 'news',
            title: 'News',
            type: 'marketing',
            keywords: '',
            titleWords: '',
            deprecated: false
          }
        ],
        pages: []
      }
    ]);
  });
  it('should omit search results with no title', () => {
    const results = [
      {
        path: 'news',
        title: '',
        type: 'marketing',
        keywords: '',
        titleWords: '',
        deprecated: false
      }
    ];
    setResults('something', results);
    expect(c.areas).toEqual([]);
  });

  describe('when there are deprecated items', () => {
    beforeEach(() => {
      apiD.deprecated = true;
      guideAC.deprecated = true;
      guideJ.deprecated = true;
      guideE.deprecated = true;
      setResults('something', standardResults);
    });
    it('should include deprecated items in priority pages unless there are fewer than 5 non-deprecated priority pages', () => {
      // Priority pages do not include deprecated items:
      expect(c.areas[1].priority).not.toContain(guideAC);
      expect(c.areas[1].priority).not.toContain(guideJ);
      // Except where there are too few priority pages:
      expect(c.areas[0].priority).toContain(apiD);
    });
    it('should move the non-priority deprecated pages to the bottom of the pages list, unsorted', () => {
      // Bottom pages are the deprecated ones (in original order)
      expect(c.areas[1].pages.slice(-3)).toEqual([guideAC, guideJ, guideE]);
    });
    it('should sort the non-deprecated, non-priority pages by title', () => {
      // The rest of the pages are non-deprecated, sorted by title
      expect(c.areas[1].pages.slice(0, -3)).toEqual([
        guideF,
        guideG,
        guideH,
        guideI,
        guideK
      ]);
    });
  });

  it('should display "Searching ..." while waiting for search results', () => {
    f.detectChanges();
    expect(getText()).toContain('Searching ...');
  });

  describe('when a search result anchor is clicked', () => {
    let Result: Result;
    let selected: Result | undefined;
    let anchor: DebugElement;
    beforeEach(() => {
      c.selected.subscribe((r: Result) => (selected = r));
      selected = undefined;
      Result = {
        path: 'news',
        title: 'News',
        type: 'marketing',
        keywords: '',
        titleWords: '',
        deprecated: false
      };
      setResults('something', [Result]);
      f.detectChanges();
      anchor = f.debugElement.query(By.css('a'));
      expect(selected).toBeNull();
    });
    it('should emit a "resultSelected" event', () => {
      anchor.triggerEventHandler('click', {
        button: 0,
        ctrlKey: false,
        metaKey: false
      });
      f.detectChanges();
      expect(selected).toBe(Result);
    });
    it('should not emit an event if mouse button is not zero (middle or right)', () => {
      anchor.triggerEventHandler('click', {
        button: 1,
        ctrlKey: false,
        metaKey: false
      });
      f.detectChanges();
      expect(selected).toBeNull();
    });
    it('should not emit an event if the `ctrl` key is pressed', () => {
      anchor.triggerEventHandler('click', {
        button: 0,
        ctrlKey: true,
        metaKey: false
      });
      f.detectChanges();
      expect(selected).toBeNull();
    });
    it('should not emit an event if the `meta` key is pressed', () => {
      anchor.triggerEventHandler('click', {
        button: 0,
        ctrlKey: false,
        metaKey: true
      });
      f.detectChanges();
      expect(selected).toBeNull();
    });
  });
  describe('when no query results', () => {
    it('should display "not found" message', () => {
      setResults('something', []);
      expect(getText()).toContain('No results');
    });
  });
});
