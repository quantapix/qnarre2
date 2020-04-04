import {Component, Input} from '@angular/core';
import {NavNode} from '../services/nav';

@Component({
  selector: 'qnr-top-menu',
  template: `
    <ul role="navigation">
      <li *ngFor="let node of nodes">
        <a class="nav-link" [href]="node.url" [title]="node.title">
          <span class="nav-link-inner">{{ node.title }}</span>
        </a>
      </li>
    </ul>
  `
})
export class TopMenuComponent {
  @Input() nodes: NavNode[];
}
