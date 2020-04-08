import {Inject, Injectable} from '@angular/core';

import {environment} from '../environments/environment';
import {WindowToken} from '../app/tokens';

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

  sendEvent(source: string, action: string, label?: string, value?: number) {
    this.ga('send', 'event', source, action, label, value);
  }

  ga(...args: any[]) {
    const fn = (this.window as any)['ga'];
    if (fn) fn(...args);
  }
}
