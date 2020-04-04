/* eslint-disable @typescript-eslint/unbound-method */
import {ReflectiveInjector, NgZone} from '@angular/core';
import {fakeAsync, tick} from '@angular/core/testing';
import {of} from 'rxjs';
import {SearchService} from './service';
import {WorkerClient} from './worker';

describe('SearchService', () => {
  let inj: ReflectiveInjector;
  let service: SearchService;
  let spy: jasmine.Spy;
  let w: WorkerClient;

  beforeEach(() => {
    spy = jasmine.createSpy('sendMessage').and.returnValue(of({}));
    w = {sendMessage: spy} as any;
    spyOn(WorkerClient, 'create').and.returnValue(w);

    inj = ReflectiveInjector.resolveAndCreate([
      SearchService,
      {
        provide: NgZone,
        useFactory: () => new NgZone({enableLongStackTrace: false})
      }
    ]);
    service = inj.get(SearchService);
  });

  describe('initWorker', () => {
    it('should create the worker and load the index after the specified delay', fakeAsync(() => {
      service.initWorker(100);
      expect(WorkerClient.create).not.toHaveBeenCalled();
      expect(w.sendMessage).not.toHaveBeenCalled();
      tick(100);
      expect(WorkerClient.create).toHaveBeenCalledWith(
        jasmine.any(Worker),
        jasmine.any(NgZone)
      );
      expect(w.sendMessage).toHaveBeenCalledWith('load-index');
    }));
  });

  describe('search', () => {
    beforeEach(() => {
      service.initWorker(1000);
      (service as any).ready = of(true);
    });
    it('should trigger a `loadIndex` synchronously (not waiting for the delay)', () => {
      expect(w.sendMessage).not.toHaveBeenCalled();
      service.search('some query').subscribe();
      expect(w.sendMessage).toHaveBeenCalledWith('load-index');
    });
    it('should send a "query-index" message to the worker', () => {
      service.search('some query').subscribe();
      expect(w.sendMessage).toHaveBeenCalledWith('query-index', 'some query');
    });
    it('should push the response to the returned observable', () => {
      const rs = {results: ['a', 'b']};
      let actual: any;
      (w.sendMessage as jasmine.Spy).and.returnValue(of(rs));
      service.search('some query').subscribe(r => (actual = r));
      expect(actual).toEqual(rs);
    });
  });
});
