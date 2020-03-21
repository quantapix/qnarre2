import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';

import {Result, Results, Area} from './types';

@Component({
  selector: 'qnr-search-results',
  templateUrl: './results.component.html'
})
export class ResultsComponent implements OnChanges {
  @Input()
  results?: Results;

  @Output()
  selected = new EventEmitter<Result>();

  areas: Area[] = [];
  readonly defaultArea = 'other';
  notFoundMessage = 'Searching ...';
  readonly topFolders = ['guide', 'tutorial'];

  ngOnChanges() {
    this.areas = this.process(this.results);
  }

  onResultSelected(page: Result, event: MouseEvent) {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
      this.selected.emit(page);
    }
  }

  private process(search?: Results) {
    if (search) {
      this.notFoundMessage = 'No results found.';
      const m: {[key: string]: Result[]} = {};
      search.results.forEach(r => {
        if (r.title) {
          const n = this.areaName(r) || this.defaultArea;
          const a = (m[n] = m[n] || []);
          a.push(r);
        }
      });
      const ks = Object.keys(m).sort((l, r) => (l > r ? 1 : -1));
      return ks.map(n => {
        const {priority, pages, deprecated} = split(m[n]);
        return {
          name,
          priority,
          pages: pages.concat(deprecated)
        } as Area;
      });
    }
    return [];
  }

  private areaName(p: Result) {
    if (this.topFolders.includes(p.path)) {
      return p.path;
    }
    const [areaName, rest] = p.path.split('/', 2);
    return rest && areaName;
  }
}

function split(ps: Result[]) {
  const priority: Result[] = [];
  const pages: Result[] = [];
  const deprecated: Result[] = [];
  ps.forEach(p => {
    if (p.deprecated) {
      deprecated.push(p);
    } else if (priority.length < 5) {
      priority.push(p);
    } else {
      pages.push(p);
    }
  });
  while (priority.length < 5 && pages.length) {
    priority.push(pages.shift());
  }
  while (priority.length < 5 && deprecated.length) {
    priority.push(deprecated.shift());
  }
  pages.sort(compare);
  return {priority, pages, deprecated};
}

function compare(l: Result, r: Result) {
  return l.title.toUpperCase() > r.title.toUpperCase() ? 1 : -1;
}
