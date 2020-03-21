import {ReflectiveInjector} from '@angular/core';

import {GaService} from './ga.service';
import {WindowToken} from '../app/tokens';

describe('GaService', () => {
  let ga: GaService;
  let inj: ReflectiveInjector;
  let spy: jasmine.Spy;
  let mock: any;

  beforeEach(() => {
    spy = jasmine.createSpy('ga');
    mock = {ga: spy};
    inj = ReflectiveInjector.resolveAndCreate([
      GaService,
      {provide: WindowToken, useFactory: () => mock}
    ]);
    ga = inj.get(GaService);
  });
  it('should initialize ga with "create" when constructed', () => {
    const first = spy.calls.first().args;
    expect(first[0]).toBe('create');
  });

  describe('#locationChanged(url)', () => {
    it('should send page to url w/ leading slash', () => {
      ga.locationChanged('testUrl');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
    });
  });

  describe('#sendPage(url)', () => {
    it('should set page to url w/ leading slash', () => {
      ga.sendPage('testUrl');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl');
    });
    it('should send "pageview" ', () => {
      ga.sendPage('testUrl');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
    });
    it('should not send twice with same URL, back-to-back', () => {
      ga.sendPage('testUrl');
      spy.calls.reset();
      ga.sendPage('testUrl');
      expect(spy).not.toHaveBeenCalled();
    });
    it('should send again even if only the hash changes', () => {
      ga.sendPage('testUrl#one');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl#one');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
      spy.calls.reset();
      ga.sendPage('testUrl#two');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl#two');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
    });
    it('should send same URL twice when other intervening URL', () => {
      ga.sendPage('testUrl');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
      spy.calls.reset();
      ga.sendPage('testUrl2');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl2');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
      spy.calls.reset();
      ga.sendPage('testUrl');
      expect(spy).toHaveBeenCalledWith('set', 'page', '/testUrl');
      expect(spy).toHaveBeenCalledWith('send', 'pageview');
    });
  });

  describe('sendEvent', () => {
    it('should send "event" with associated data', () => {
      ga.sendEvent('some source', 'some campaign', 'a label', 45);
      expect(spy).toHaveBeenCalledWith(
        'send',
        'event',
        'some source',
        'some campaign',
        'a label',
        45
      );
    });
  });

  it('should support replacing the `window.ga` function', () => {
    const spy2 = jasmine.createSpy('new ga');
    mock.ga = spy2;
    spy.calls.reset();
    ga.sendPage('testUrl');
    expect(spy).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledWith('set', 'page', '/testUrl');
    expect(spy2).toHaveBeenCalledWith('send', 'pageview');
  });
});
