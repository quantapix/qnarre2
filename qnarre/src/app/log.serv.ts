import {ErrorHandler, Injectable} from '@angular/core';

import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  constructor(private handler: ErrorHandler) {}

  info(v: any, ...rest: any[]) {
    if (!environment.production) {
      console.log(v, ...rest);
    }
  }

  warn(v: any, ...rest: any[]) {
    console.warn(v, ...rest);
  }

  fail(e: Error) {
    this.handler.handleError(e);
  }
}

@Injectable()
export class MockLog {
  out = {
    info: [] as any[],
    warn: [] as any[],
    fail: [] as any[]
  };

  info(v: any, ...rest: any[]) {
    this.out.info.push([v, ...rest]);
  }

  warn(v: any, ...rest: any[]) {
    this.out.warn.push([v, ...rest]);
  }

  fail(v: any, ...rest: any[]) {
    this.out.fail.push([v, ...rest]);
  }
}
