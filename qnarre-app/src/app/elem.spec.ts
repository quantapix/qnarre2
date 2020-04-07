import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ElemComp} from './elem';
import {ElemService} from '../services/elem';

import {LogService} from '../services/log';
import {MockLog} from '../services/log';

describe('ElemComp', () => {
  let loader: any;
  let logger: MockLog;
  let c: ComponentFixture<ElemComp>;
  beforeEach(() => {
    loader = jasmine.createSpyObj('ElemService', ['loadContained', 'load']);
    const inj = TestBed.configureTestingModule({
      declarations: [ElemComp],
      providers: [
        {provide: ElemService, useValue: loader},
        {provide: LogService, useClass: MockLog}
      ]
    });
    logger = inj.inject(MockLog);
    c = TestBed.createComponent(ElemComp);
  });
  it('should set HTML content based on selector', () => {
    const e = c.nativeElement;
    expect(e.innerHTML).toBe('');
    c.componentInstance.selector = 'foo-bar';
    c.detectChanges();
    expect(e.innerHTML).toBe('<foo-bar></foo-bar>');
  });
  it('should load specified custom element', () => {
    expect(loader.load).not.toHaveBeenCalled();
    c.componentInstance.selector = 'foo-bar';
    c.detectChanges();
    expect(loader.load).toHaveBeenCalledWith('foo-bar');
  });
  it('should log error if selector empty', () => {
    c.detectChanges();
    expect(loader.load).not.toHaveBeenCalled();
    expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
    expect(logger.output.error[0][0].message).toBe(
      "Invalid selector for 'qnr-elem': "
    );
  });
  it('should log error if the selector invalid', () => {
    c.componentInstance.selector = 'foo-bar><script></script><foo-bar';
    c.detectChanges();
    expect(loader.load).not.toHaveBeenCalled();
    expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
    expect(logger.output.error[0][0].message).toBe(
      "Invalid selector for 'qnr-elem': foo-bar><script></script><foo-bar"
    );
  });
});
