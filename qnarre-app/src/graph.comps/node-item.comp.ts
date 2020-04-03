import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'qnr-node-list-item',
  templateUrl: './node-item.comp.html',
  styleUrls: ['./node-item.comp.scss']
})
export class NodeListItemComp implements OnInit {
  cardNode: any;
  itemNode: any;
  edgeLabel: string;
  itemRenderInfo: any;
  name: string;
  itemType: string; // observer: '_itemTypeChanged';
  colorBy: string;
  colorByParams: any;
  templateIndex: Function;

  constructor() {}

  ngOnInit() {}

  _itemTypeChanged() {
    if (this.itemType !== 'subnode') {
      this.$['list-item'].classList.add('clickable');
    } else {
      this.$['list-item'].classList.remove('clickable');
    }
  }

  _nodeListener(event) {
    this.fire('node-list-item-' + event.type, {
      cardNode: this.cardNode.name,
      nodeName: this.name,
      type: this.itemType
    });
  }

  _fadedClass(itemRenderInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut ? 'faded' : '';
  }
}
