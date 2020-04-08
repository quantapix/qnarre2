import {ErrorHandler, Injectable} from '@angular/core';

import {environment} from '../environments/environment';

@Injectable()
export class LogService {
  constructor(private handler: ErrorHandler) {}

  info(v: any, ...rest: any[]) {
    if (!environment.production) {
      console.log(v, ...rest);
    }
  }

  error(e: Error) {
    this.handler.handleError(e);
  }

  warn(v: any, ...rest: any[]) {
    console.warn(v, ...rest);
  }
}

@Injectable()
export class MockLog {
  output = {
    info: [] as any[],
    error: [] as any[],
    warn: [] as any[]
  };

  info(v: any, ...rest: any[]) {
    this.output.info.push([v, ...rest]);
  }

  error(v: any, ...rest: any[]) {
    this.output.error.push([v, ...rest]);
  }

  warn(v: any, ...rest: any[]) {
    this.output.warn.push([v, ...rest]);
  }
}
