import {Component} from '@angular/core';

@Component({
  selector: 'qnr-markdown-view',
  template: '<div id="markdown" inner-h-t-m-l="[[html]]"></div>',
  styleUrls: ['./md-view.comp.scss']
})
export class MarkdownViewComp {
  html = '';

  attached() {
    window.requestAnimationFrame(() => {
      this.scopeSubtree(this.$.markdown, /*shouldObserve=*/ true);
    });
  }
}
