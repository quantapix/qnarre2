import {ErrorHandler, Injectable} from '@angular/core';

import {environment} from '../environments/environment';

@Injectable()
export class LoggerService {
  constructor(private handler: ErrorHandler) {}

  log(value: any, ...rest: any[]) {
    if (!environment.production) {
      console.log(value, ...rest);
    }
  }

  error(err: Error) {
    this.handler.handleError(err);
  }

  warn(value: any, ...rest: any[]) {
    console.warn(value, ...rest);
  }
}
