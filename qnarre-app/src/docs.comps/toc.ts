import {Component, NgModule, Type} from '@angular/core';
import {ElementRef, QueryList, ViewChildren} from '@angular/core';
import {AfterViewInit, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';

import {asapScheduler, combineLatest, Subject} from 'rxjs';
import {startWith, subscribeOn, takeUntil} from 'rxjs/operators';

import {WithElem} from '../app/elem.serv';
import {ScrollService} from '../services/scroll';
import {Item, TocService} from '../services/toc';

type TocType = 'None' | 'Floating' | 'Embedded' | 'Expandable';

@Component({
  selector: 'qnr-toc',
  templateUrl: 'toc.html',
  styles: []
})
export class TocComp implements OnInit, AfterViewInit, OnDestroy {
  type = 'None' as TocType;
  collapsed = true;
  embedded = false;
  max = 4;
  items = [] as Item[];
  idx?: number;
  @ViewChildren('tocItem') private tis = {} as QueryList<ElementRef>;
  private onDestroy = new Subject();

  constructor(
    private scroll: ScrollService,
    ref: ElementRef,
    private toc: TocService
  ) {
    this.embedded = ref.nativeElement.className.indexOf('embedded') !== -1;
  }

  ngOnInit() {
    this.toc.items.pipe(takeUntil(this.onDestroy)).subscribe(ts => {
      this.items = ts;
      const c = count(this.items, i => i.level !== 'h1');
      this.type =
        c > 0
          ? this.embedded
            ? c > this.max
              ? 'Expandable'
              : 'Embedded'
            : 'Floating'
          : 'None';
    });
  }

  ngAfterViewInit() {
    if (!this.embedded) {
      combineLatest([
        this.toc.active.pipe(subscribeOn(asapScheduler)),
        this.tis.changes.pipe(startWith(this.items))
      ])
        .pipe(takeUntil(this.onDestroy))
        .subscribe(([i, items]) => {
          this.idx = i ?? undefined;
          if (i === null || i >= items.length) return;
          const e = items.toArray()[i].nativeElement;
          const p = e.offsetParent;
          const er = e.getBoundingClientRect();
          const pr = p.getBoundingClientRect();
          const isIn = er.top >= pr.top && er.bottom <= pr.bottom;
          if (!isIn) p.scrollTop += er.top - pr.top - p.clientHeight / 2;
        });
    }
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

  toggle(scroll = true) {
    this.collapsed = !this.collapsed;
    if (scroll && this.collapsed) this.toTop();
  }

  toTop() {
    this.scroll.scrollToTop();
  }
}

function count<T>(a: T[], f: (i: T) => boolean) {
  return a.reduce((r, i) => (f(i) ? r + 1 : r), 0);
}

@NgModule({
  imports: [CommonModule, MatIconModule],
  declarations: [TocComp],
  entryComponents: [TocComp]
})
export class TocModule implements WithElem {
  elemComp: Type<any> = TocComp;
}
