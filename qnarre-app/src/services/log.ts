import {ErrorHandler, Injectable} from '@angular/core';

import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  constructor(private handler: ErrorHandler) {}

  log(v: any, ...rest: any[]) {
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

@Injectable({
  providedIn: 'root'
})
export class MockLog {
  output: {log: any[]; error: any[]; warn: any[]} = {
    log: [],
    error: [],
    warn: []
  };

  log(value: any, ...rest: any[]) {
    this.output.log.push([value, ...rest]);
  }

  error(value: any, ...rest: any[]) {
    this.output.error.push([value, ...rest]);
  }

  warn(value: any, ...rest: any[]) {
    this.output.warn.push([value, ...rest]);
  }
}
