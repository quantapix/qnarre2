import {Directive, Input, ElementRef, OnInit} from '@angular/core';

import {SceneService} from './scene.service';

@Directive({
  selector: '[zoomableOf]'
})
export class ZoomableDirective implements OnInit {
  @Input('zoomableOf') zoomableOf = {} as ElementRef;

  constructor(private scene: SceneService, private elem: ElementRef) {}

  ngOnInit() {
    this.scene.applyZoomable(this.zoomableOf, this.elem.nativeElement);
  }
}
