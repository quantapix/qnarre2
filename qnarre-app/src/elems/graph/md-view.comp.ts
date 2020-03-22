import {Component} from '@angular/core';

@Component({
  selector: 'qnr-markdown-view',
  template: '<div id="markdown" inner-h-t-m-l="[[html]]"></div>',
  styleUrls: ['./styles/markdown-view.component.scss']
})
export class MarkdownViewComponent {
  html = '';

  attached() {
    window.requestAnimationFrame(() => {
      this.scopeSubtree(this.$.markdown, /*shouldObserve=*/ true);
    });
  }
}
