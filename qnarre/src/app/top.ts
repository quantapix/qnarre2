import {Component, Input} from '@angular/core';

import {Item} from './nav.serv';

@Component({
  selector: 'qnr-top-menu',
  template: `
    <ul role="navigation">
      <li *ngFor="let item of items">
        <a class="nav-link" [href]="item.url" [title]="item.title">
          <span class="nav-link-inner">{{ item.title }}</span>
        </a>
      </li>
    </ul>
  `
})
export class TopMenuComp {
  @Input() items = [] as Item[];
}
