import {ErrorHandler, ReflectiveInjector} from '@angular/core';

import {LogService} from './log.serv';

describe('log service', () => {
  let s: any;
  let w: any;
  let log: LogService;
  let h: ErrorHandler;
  beforeEach(() => {
    s = spyOn(console, 'log');
    w = spyOn(console, 'warn');
    const inj = ReflectiveInjector.resolveAndCreate([
      LogService,
      {provide: ErrorHandler, useClass: MockHandler}
    ]);
    log = inj.get(LogService);
    h = inj.get(ErrorHandler);
  });
  describe('log', () => {
    it('should delegate to console.log', () => {
      log.info('param1', 'param2', 'param3');
      expect(s).toHaveBeenCalledWith('param1', 'param2', 'param3');
    });
  });
  describe('warn', () => {
    it('should delegate to console.warn', () => {
      log.warn('param1', 'param2', 'param3');
      expect(w).toHaveBeenCalledWith('param1', 'param2', 'param3');
    });
  });
  describe('error', () => {
    it('should delegate to ErrorHandler', () => {
      const e = new Error('some error message');
      log.fail(e);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(h.handleError).toHaveBeenCalledWith(e);
    });
  });
});

class MockHandler implements ErrorHandler {
  handleError = jasmine.createSpy('handleError');
}
