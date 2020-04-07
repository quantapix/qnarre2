import {
  AfterViewInit,
  Component,
  ViewChild,
  ElementRef,
  EventEmitter,
  Output
} from '@angular/core';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

import {LocService} from '../services/loc';

@Component({
  selector: 'qnr-search-box',
  template: `
    <input
      #searchBox
      type="search"
      aria-label="search"
      placeholder="Search"
      (input)="doSearch()"
      (keyup)="doSearch()"
      (focus)="doFocus()"
      (click)="doSearch()"
    />
  `
})
export class BoxComp implements AfterViewInit {
  private debounce = 300;
  private subject = new Subject<string>();

  @ViewChild('searchBox', {static: true}) searchBox: ElementRef;
  @Output() onSearch = this.subject.pipe(
    distinctUntilChanged(),
    debounceTime(this.debounce)
  );
  @Output() onFocus = new EventEmitter<string>();

  constructor(private location: LocService) {}

  ngAfterViewInit() {
    const query = this.location.search()['search'];
    if (query) {
      this.query = this.decode(query);
      this.doSearch();
    }
  }

  doSearch() {
    this.subject.next(this.query);
  }

  doFocus() {
    this.onFocus.emit(this.query);
  }

  focus() {
    this.searchBox.nativeElement.focus();
  }

  private decode(query: string): string {
    return query.replace(/\+/g, ' ');
  }

  private get query() {
    return this.searchBox.nativeElement.value;
  }
  private set query(value: string) {
    this.searchBox.nativeElement.value = value;
  }
}
