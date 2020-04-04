import {Component, OnInit} from '@angular/core';

import * as qp from '../graph.app/params';
import * as qt from '../graph.app/types';
import * as hierarchy from '../../graph/hierarchy';

@Component({
  selector: 'qnr-graph-compat-item',
  template: `
    <div
      id="list-item"
      on-mouseover="(_nodeListener)"
      on-mouseout="(_nodeListener)"
      on-click="(_nodeListener)"
    >
      <div class$="{{" _fadedClass(itemRenderInfo) }}>
        <qnr-graph-node-icon
          class="node-icon"
          [height]="12"
          [colorBy]="colorBy"
          color-by-params="[[colorByParams]]"
          [node]="itemNode"
          [ndata]="itemRenderInfo"
          [tidx]="templateIndex"
        >
        </qnr-graph-node-icon>
        <span title="{{ name }}">{{ name }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      #list-item {
        width: 100%;
        color: #565656;
        font-size: 11pt;
        font-weight: 400;
        position: relative;
        display: inline-block;
      }
      #list-item:hover {
        background-color: var(--google-yellow-100);
      }
      .clickable {
        cursor: pointer;
      }
      #list-item span {
        margin-left: 40px;
      }
      #list-item.excluded span {
        color: #999;
      }
      #list-item span.edge-label {
        float: right;
        font-size: 10px;
        margin-left: 3px;
        margin-right: 5px;
      }
      .node-icon {
        position: absolute;
        top: 1px;
        left: 2px;
      }
      .faded span {
        color: var(--tb-graph-faded);
      }
    `
  ]
})
export class CompatItemComp {
  cardNode: any;
  itemNode: any;
  edgeLabel: string;
  itemRenderInfo: any;
  name: string;
  itemType: string; // observer: '_itemTypeChanged';
  colorBy: qt.ColorBy;
  colorByParams: any;
  templateIndex: Function;

  _itemTypeChanged() {
    if (this.itemType !== 'subnode') {
      this.$['list-item'].classList.add('clickable');
    } else {
      this.$['list-item'].classList.remove('clickable');
    }
  }

  _nodeListener(event) {
    this.fire('node-list-item-' + event.type, {
      nodeName: this.name,
      type: this.itemType
    });
  }

  _fadedClass(itemRenderInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut ? 'faded' : '';
  }
}
