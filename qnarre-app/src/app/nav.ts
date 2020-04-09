import {Component, Input, OnChanges} from '@angular/core';

import * as qt from '../types';
import {Item, Node} from './nav.serv';

@Component({
  selector: 'qnr-nav-item',
  template: `
    <div *ngIf="!item.children">
      <a
        href="{{ item.url }}"
        [ngClass]="classes"
        title="{{ item.tooltip }}"
        class="vertical-menu-item"
      >
        <span>{{ item.title }}</span>
      </a>
    </div>
    <div *ngIf="item.children">
      <a
        *ngIf="item.url"
        href="{{ item.url }}"
        [ngClass]="classes"
        title="{{ item.tooltip }}"
        (click)="headerClicked()"
        class="vertical-menu-item heading"
      >
        <span>{{ item.title }}</span>
        <mat-icon
          class="rotating-icon"
          svgIcon="keyboard_arrow_right"
        ></mat-icon>
      </a>
      <button
        *ngIf="!item.url"
        type="button"
        [ngClass]="classes"
        title="{{ item.tooltip }}"
        (click)="headerClicked()"
        class="vertical-menu-item heading"
        [attr.aria-pressed]="expanded"
      >
        <span>{{ item.title }}</span>
        <mat-icon
          class="rotating-icon"
          svgIcon="keyboard_arrow_right"
        ></mat-icon>
      </button>
      <div class="heading-children" [ngClass]="classes">
        <qnr-nav-item
          *ngFor="let item of children"
          [level]="level + 1"
          [wide]="wide"
          [pExpanded]="expanded"
          [item]="item"
          [selItems]="selItems"
        ></qnr-nav-item>
      </div>
    </div>
  `
})
export class NavItemComp implements OnChanges {
  @Input() level = 1;
  @Input() wide = false;
  @Input() item = {title: ''} as Item;
  @Input() selItems?: Item[];
  @Input() pExpanded = true;

  expanded = false;
  selected = false;
  classes = {} as qt.Dict<boolean>;
  children = [] as Item[];

  ngOnChanges() {
    this.children = this.item.children
      ? this.item.children.filter(n => !n.hidden)
      : [];
    if (this.selItems) {
      const i = this.selItems.indexOf(this.item);
      this.selected = i !== -1;
      this.expanded =
        this.pExpanded && (this.selected || (this.wide && this.expanded));
    } else {
      this.selected = false;
    }
    this.setClasses();
  }

  headerClicked() {
    this.expanded = !this.expanded;
    this.setClasses();
  }

  setClasses() {
    this.classes = {
      ['level-' + this.level]: true,
      collapsed: !this.expanded,
      expanded: this.expanded,
      selected: this.selected
    };
  }
}

@Component({
  selector: 'qnr-nav-menu',
  template: `
    <qnr-nav-item
      *ngFor="let item of unhidden"
      [wide]="wide"
      [item]="item"
      [selItems]="node?.items"
    >
    </qnr-nav-item>
  `
})
export class NavMenuComp {
  @Input() wide = false;
  @Input() items?: Item[];
  @Input() node?: Node;

  get unhidden() {
    return this.items ? this.items.filter(i => !i.hidden) : [];
  }
}
