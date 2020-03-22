import * as d3 from 'd3';
import {Component, OnInit} from '@angular/core';
import {Minimap} from '../../graph/scene/minimap';

@Component({
  selector: 'qnr-graph-minimap',
  templateUrl: './templates/minimap.component.html',
  styleUrls: ['./styles/minimap.component.scss']
})
export class MinimapComponent implements OnInit {
  minimap: Minimap;
  constructor(
    svg: SVGSVGElement,
    zoomG: SVGGElement,
    mainZoom: d3.ZoomBehavior<any, any>,
    maxWandH: number,
    labelPadding: number
  ) {
    this.minimap = new Minimap(
      svg,
      zoomG,
      mainZoom,
      this,
      maxWandH,
      labelPadding
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ngOnInit() {}
}
