import {Component, Input} from '@angular/core';

import {Item, Version} from './nav.serv';

@Component({
  selector: 'qnr-footer',
  template: `
    <div class="grid-fluid">
      <div class="footer-block" *ngFor="let item of items">
        <h3>{{ item.title }}</h3>
        <ul>
          <li *ngFor="let item of item.children">
            <a
              class="link"
              [href]="item.url"
              [title]="item.tooltip || item.title"
              >{{ item.title }}</a
            >
          </li>
        </ul>
      </div>
    </div>
    <p>
      By Quantapix ©2020. Code licensed under an
      <a href="license" title="License text">MIT-style License</a>.
    </p>
    <p>Version {{ version?.full }}.</p>
  `
})
export class FooterComp {
  @Input() items = [] as Item[];
  @Input() version = {full: '?.?.?'} as Version;
}
