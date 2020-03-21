import {Component, ElementRef, Input, OnInit} from '@angular/core';

import {LoggerService} from '../services/logger.service';
import {ElementsLoader} from './loader';

@Component({
  selector: 'qnr-element',
  template: ''
})
export class ElementComponent implements OnInit {
  @Input() selector = '';

  constructor(
    private ref: ElementRef,
    private loader: ElementsLoader,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    if (!this.selector || /[^\w-]/.test(this.selector)) {
      this.logger.error(
        new Error(`Invalid selector for 'qnr-element': ${this.selector}`)
      );
      return;
    }
    this.ref.nativeElement.innerHTML = `<${this.selector}></${this.selector}>`;
    this.loader.load(this.selector);
  }
}
