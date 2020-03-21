import {ErrorHandler, ReflectiveInjector} from '@angular/core';

import {LoggerService} from './logger.service';

describe('logger service', () => {
  let logSpy: jasmine.Spy;
  let warnSpy: jasmine.Spy;
  let logger: LoggerService;
  let handler: ErrorHandler;
  beforeEach(() => {
    logSpy = spyOn(console, 'log');
    warnSpy = spyOn(console, 'warn');
    const inj = ReflectiveInjector.resolveAndCreate([
      LoggerService,
      {provide: ErrorHandler, useClass: MockErrorHandler}
    ]);
    logger = inj.get(LoggerService);
    handler = inj.get(ErrorHandler);
  });
  describe('log', () => {
    it('should delegate to console.log', () => {
      logger.log('param1', 'param2', 'param3');
      expect(logSpy).toHaveBeenCalledWith('param1', 'param2', 'param3');
    });
  });
  describe('warn', () => {
    it('should delegate to console.warn', () => {
      logger.warn('param1', 'param2', 'param3');
      expect(warnSpy).toHaveBeenCalledWith('param1', 'param2', 'param3');
    });
  });
  describe('error', () => {
    it('should delegate to ErrorHandler', () => {
      const err = new Error('some error message');
      logger.error(err);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(handler.handleError).toHaveBeenCalledWith(err);
    });
  });
});

class MockErrorHandler implements ErrorHandler {
  handleError = jasmine.createSpy('handleError');
}
