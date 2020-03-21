import {
  Component,
  Input,
  ChangeDetectorRef,
  HostListener,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit
} from '@angular/core';
import {SceneService} from './scene.service';
import {Ndata, Ldata, ForceGraph} from './model';

@Component({
  selector: 'qnr-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg #svg [attr.width]="opts.w" [attr.height]="opts.h">
      <g [zoomableOf]="svg">
        <g [linkVisual]="link" *ngFor="let link of links"></g>
        <g
          [nodeVisual]="node"
          *ngFor="let node of nodes"
          [draggableNode]="node"
          [draggableInGraph]="graph!"
        ></g>
      </g>
    </svg>
  `,
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, AfterViewInit {
  @Input('nodes') nodes = [] as Ndata[];
  @Input('links') links = [] as Ldata[];
  opts = {w: 800, h: 600};
  graph?: ForceGraph;

  constructor(private scene: SceneService, private ref: ChangeDetectorRef) {}

  ngOnInit() {
    this.graph = this.scene.getForceGraph(this.nodes, this.links, this.opts);
    this.graph.ticker.subscribe((_: any) => this.ref.markForCheck());
  }

  ngAfterViewInit() {
    this.graph!.init(this.opts);
  }

  @HostListener('window:resize', ['$event'])
  onResize(_event: any) {
    this.opts = {w: window.innerWidth, h: window.innerHeight};
    this.graph!.init(this.opts);
  }
}
