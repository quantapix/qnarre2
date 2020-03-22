import {Directive, Input, ElementRef, OnInit} from '@angular/core';

import {SceneServ} from './scene.serv';
import {Ndata, ForceGraph} from './model';

@Directive({
  selector: '[draggableNode]'
})
export class DraggableDirective implements OnInit {
  @Input('draggableNode') draggableNode = {} as Ndata;
  @Input('draggableInGraph') draggableInGraph = {} as ForceGraph;

  constructor(private scene: SceneServ, private elem: ElementRef) {}

  ngOnInit() {
    this.scene.applyDraggable(
      this.elem.nativeElement,
      this.draggableNode,
      this.draggableInGraph
    );
  }
}
