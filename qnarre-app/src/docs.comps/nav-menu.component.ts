import {Component, Input} from '@angular/core';
import {CurrentNode, NavNode} from '../services/nav';

@Component({
  selector: 'qnr-nav-menu',
  template: `
    <qnr-nav-item
      *ngFor="let node of filteredNodes"
      [node]="node"
      [selectedNodes]="currentNode?.nodes"
      [isWide]="isWide"
    >
    </qnr-nav-item>
  `
})
export class NavMenuComponent {
  @Input() currentNode: CurrentNode | undefined;
  @Input() isWide = false;
  @Input() nodes: NavNode[];
  get filteredNodes() {
    return this.nodes ? this.nodes.filter(n => !n.hidden) : [];
  }
}
