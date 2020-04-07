import {Component, NgModule, Type} from '@angular/core';
import {ElementRef, QueryList, ViewChildren} from '@angular/core';
import {AfterViewInit, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';

import {asapScheduler, combineLatest, Subject} from 'rxjs';
import {startWith, subscribeOn, takeUntil} from 'rxjs/operators';

import {WithElem} from '../services/elem';
import {ScrollService} from '../services/scroll';
import {TocItem, TocService} from '../services/toc';

type TocType = 'None' | 'Floating' | 'Embedded' | 'Expandable';

@Component({
  selector: 'qnr-toc',
  templateUrl: 'toc.comp.html',
  styles: []
})
export class TocComp implements OnInit, AfterViewInit, OnDestroy {
  index: number | null = null;
  type: TocType = 'None';
  isCollapsed = true;
  isEmbedded = false;
  @ViewChildren('tocItem') private items = {} as QueryList<ElementRef>;
  private onDestroy = new Subject();
  primaryMax = 4;
  tocList = [] as TocItem[];

  constructor(
    private scroll: ScrollService,
    ref: ElementRef,
    private toc: TocService
  ) {
    this.isEmbedded = ref.nativeElement.className.indexOf('embedded') !== -1;
  }

  ngOnInit() {
    this.toc.tocList.pipe(takeUntil(this.onDestroy)).subscribe(tl => {
      this.tocList = tl;
      const c = count(this.tocList, item => item.level !== 'h1');
      this.type =
        c > 0
          ? this.isEmbedded
            ? c > this.primaryMax
              ? 'Expandable'
              : 'Embedded'
            : 'Floating'
          : 'None';
    });
  }

  ngAfterViewInit() {
    if (!this.isEmbedded) {
      combineLatest([
        this.toc.activeItemIndex.pipe(subscribeOn(asapScheduler)),
        this.items.changes.pipe(startWith(this.items))
      ])
        .pipe(takeUntil(this.onDestroy))
        .subscribe(([i, items]) => {
          this.index = i;
          if (i === null || i >= items.length) {
            return;
          }
          const e = items.toArray()[i].nativeElement;
          const p = e.offsetParent;
          const er = e.getBoundingClientRect();
          const pr = p.getBoundingClientRect();
          const isInViewport = er.top >= pr.top && er.bottom <= pr.bottom;
          if (!isInViewport) {
            p.scrollTop += er.top - pr.top - p.clientHeight / 2;
          }
        });
    }
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

  toggle(scroll = true) {
    this.isCollapsed = !this.isCollapsed;
    if (scroll && this.isCollapsed) this.toTop();
  }

  toTop() {
    this.scroll.scrollToTop();
  }
}

function count<T>(a: T[], fn: (i: T) => boolean) {
  return a.reduce((r, i) => (fn(i) ? r + 1 : r), 0);
}

@NgModule({
  imports: [CommonModule, MatIconModule],
  declarations: [TocComp],
  entryComponents: [TocComp]
})
export class TocModule implements WithElem {
  elemComp: Type<any> = TocComp;
}
