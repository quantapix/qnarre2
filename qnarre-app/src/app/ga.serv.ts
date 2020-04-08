import {Inject, Injectable} from '@angular/core';

import {WindowToken} from './types';
import {environment} from '../environments/environment';

@Injectable()
export class GaService {
  private url = '';

  constructor(@Inject(WindowToken) private window: Window) {
    this.ga('create', environment['gaId'], 'auto');
  }

  locationChanged(url: string) {
    this.sendPage(url);
  }

  sendPage(url: string) {
    if (url !== this.url) {
      this.url = url;
      this.ga('set', 'page', '/' + url);
      this.ga('send', 'pageview');
    }
  }

  sendEvent(src: string, act: string, label?: string, v?: number) {
    this.ga('send', 'event', src, act, label, v);
  }

  ga(...args: any[]) {
    const fn = (this.window as any)['ga'];
    if (fn) fn(...args);
  }
}
