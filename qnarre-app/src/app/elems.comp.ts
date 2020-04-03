import {Component, ElementRef, Input, OnInit} from '@angular/core';

import {LoggerService} from '../services/logger.service';
import {ElemsLoader} from './loader';

@Component({
  selector: 'qnr-elem',
  template: ''
})
export class ElemsComp implements OnInit {
  @Input() selector = '';

  constructor(
    private ref: ElementRef,
    private loader: ElemsLoader,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    if (!this.selector || /[^\w-]/.test(this.selector)) {
      this.logger.error(
        new Error(`Invalid selector for 'qnr-elem': ${this.selector}`)
      );
      return;
    }
    this.ref.nativeElement.innerHTML = `<${this.selector}></${this.selector}>`;
    this.loader.load(this.selector);
  }
}
