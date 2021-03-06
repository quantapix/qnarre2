import {Component, ElementRef, Input, OnInit, Optional} from '@angular/core';

import {ElemService} from './elem.serv';
import {LogService} from './log.serv';

@Component({
  selector: 'qnr-elem',
  template: ''
})
export class ElemComp implements OnInit {
  @Input() selector?: string;

  constructor(
    private ref: ElementRef,
    private elem: ElemService,
    @Optional() private log?: LogService
  ) {}

  ngOnInit() {
    if (!this.selector || /[^\w-]/.test(this.selector)) {
      this.log?.fail(new Error(`Invalid selector ${this.selector}`));
      return;
    }
    this.ref.nativeElement.innerHTML = `<${this.selector}></${this.selector}>`;
    this.elem.load(this.selector);
  }
}
