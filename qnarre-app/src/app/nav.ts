import {Component, Input, OnChanges} from '@angular/core';

import * as qt from '../types';
import {Item, Node} from './nav.serv';

@Component({
  selector: 'qnr-nav-item',
  templateUrl: 'nav.html'
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
