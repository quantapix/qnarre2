import {Directive, Input, ElementRef, OnInit} from '@angular/core';

import {SceneServ} from './scene.serv';

@Directive({
  selector: '[zoomableOf]'
})
export class ZoomableDirective implements OnInit {
  @Input('zoomableOf') zoomableOf = {} as ElementRef;

  constructor(private scene: SceneServ, private elem: ElementRef) {}

  ngOnInit() {
    this.scene.applyZoomable(this.zoomableOf, this.elem.nativeElement);
  }
}
