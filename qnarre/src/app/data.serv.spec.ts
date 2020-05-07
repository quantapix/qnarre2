import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Subscription} from 'rxjs';

import {LocService, MockLoc} from './loc.serv';
import {LogService} from './log.serv';
import {MockLog} from './log.serv';
import {DataService, Data, FETCH_ERR, NOT_FOUND} from './data.serv';

const CONTENT_URL_PREFIX = 'generated/docs/';

describe('DataService', () => {
  let httpMock: HttpTestingController;

  function createInjector(url: string) {
    return TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DataService,
        {
          provide: LocService,
          useFactory: () => new MockLoc(url)
        },
        {provide: LogService, useClass: MockLog}
      ]
    });
  }

  function getServices(url = '') {
    const injector = createInjector(url);
    httpMock = injector.inject(HttpTestingController);
    return {
      loc: (injector.inject(LocService) as any) as MockLoc,
      doc: (injector.inject(DataService) as any) as DataService,
      log: (injector.inject(LogService) as any) as MockLog
    };
  }

  afterEach(() => httpMock.verify());

  describe('currentDocument', () => {
    it('should fetch a document for the initial location', () => {
      const {doc} = getServices('initial/doc');
      doc.data$.subscribe();
      httpMock.expectOne(CONTENT_URL_PREFIX + 'initial/doc.json');
      expect().nothing();
    });
    it('should emit a document each time the location changes', () => {
      let d: Data | undefined;
      const doc0 = {v: 'doc 0', id: 'initial/doc'};
      const doc1 = {v: 'doc 1', id: 'new/doc'};
      const {doc, loc} = getServices('initial/doc');
      doc.data$.subscribe(doc => (d = doc));
      expect(d).toBeUndefined();
      httpMock.expectOne({}).flush(doc0);
      expect(d).toEqual(doc0);
      loc.go('new/doc');
      httpMock.expectOne({}).flush(doc1);
      expect(d).toEqual(doc1);
    });
    it('should emit the not-found document if the document is not found on the server', () => {
      let currentDocument: Data | undefined;
      const notFoundDoc = {
        id: NOT_FOUND,
        contents: '<h1>Page Not Found</h1>'
      };
      const {doc, log} = getServices('missing/doc');
      doc.data$.subscribe(doc => (currentDocument = doc));
      httpMock
        .expectOne({})
        .flush(null, {status: 404, statusText: 'NOT FOUND'});
      expect(log.out.fail).toEqual([[jasmine.any(Error)]]);
      expect(log.out.fail[0][0].message).toEqual(
        `Document file not found at 'missing/doc'`
      );
      log.out.fail = [];
      httpMock
        .expectOne(CONTENT_URL_PREFIX + 'file-not-found.json')
        .flush(notFoundDoc);
      expect(log.out.fail).toEqual([]);
      expect(currentDocument).toEqual(notFoundDoc);
    });
    it('should emit a hard-coded not-found document if the not-found document is not found on the server', () => {
      let currentDocument: Data | undefined;
      const hardCodedNotFoundDoc = {
        contents: 'Document not found',
        id: NOT_FOUND
      };
      const nextDoc = {v: 'Next Doc', id: 'new/doc'};
      const {doc, loc} = getServices(NOT_FOUND);
      doc.data$.subscribe(doc => (currentDocument = doc));
      httpMock
        .expectOne({})
        .flush(null, {status: 404, statusText: 'NOT FOUND'});
      expect(currentDocument).toEqual(hardCodedNotFoundDoc);
      loc.go('new/doc');
      httpMock.expectOne({}).flush(nextDoc);
      expect(currentDocument).toEqual(nextDoc);
    });
    it('should use a hard-coded error doc if the request fails (but not cache it)', () => {
      let d = {} as Data;
      const doc1 = {v: 'doc 1'} as Data;
      const doc2 = {v: 'doc 2'} as Data;
      const {doc, loc, log} = getServices('initial/doc');
      doc.data$.subscribe(doc => (d = doc));
      httpMock
        .expectOne({})
        .flush(null, {status: 500, statusText: 'Server Error'});
      expect(d.k).toEqual(FETCH_ERR);
      expect(d.v).toContain(
        'We are unable to retrieve the "initial/doc" page at this time.'
      );
      expect(log.out.fail).toEqual([[jasmine.any(Error)]]);
      expect(log.out.fail[0][0].message).toEqual(
        `Error fetching document 'initial/doc': (Http failure response for generated/docs/initial/doc.json: 500 Server Error)`
      );
      loc.go('new/doc');
      httpMock.expectOne({}).flush(doc1);
      expect(d).toEqual(jasmine.objectContaining(doc1));
      loc.go('initial/doc');
      httpMock.expectOne({}).flush(doc2);
      expect(d).toEqual(jasmine.objectContaining(doc2));
    });
    it('should not crash the app if the response is invalid JSON', () => {
      let d!: Data;
      const doc1 = {v: 'doc 1'} as Data;
      const {doc, loc} = getServices('initial/doc');
      doc.data$.subscribe(doc => (d = doc));
      httpMock.expectOne({}).flush('this is invalid JSON');
      expect(d.k).toEqual(FETCH_ERR);
      loc.go('new/doc');
      httpMock.expectOne({}).flush(doc1);
      expect(d).toEqual(jasmine.objectContaining(doc1));
    });
    it('should not make a request to the server if the doc is in the cache already', () => {
      let d!: Data;
      let subscription: Subscription;
      const doc0 = {v: 'doc 0'} as Data;
      const doc1 = {v: 'doc 1'} as Data;
      const {doc, loc} = getServices('url/0');
      subscription = doc.data$.subscribe(doc => (d = doc));
      httpMock.expectOne({}).flush(doc0);
      expect(d).toEqual(jasmine.objectContaining(doc0));
      subscription.unsubscribe();
      subscription = doc.data$.subscribe(doc => (d = doc));
      loc.go('url/1');
      httpMock.expectOne({}).flush(doc1);
      expect(d).toEqual(jasmine.objectContaining(doc1));
      subscription.unsubscribe();
      subscription = doc.data$.subscribe(doc => (d = doc));
      loc.go('url/0');
      httpMock.expectNone({});
      expect(d).toEqual(jasmine.objectContaining(doc0));
      subscription.unsubscribe();
      subscription = doc.data$.subscribe(doc => (d = doc));
      loc.go('url/1');
      httpMock.expectNone({});
      expect(d).toEqual(jasmine.objectContaining(doc1));
      subscription.unsubscribe();
    });
  });

  describe('computeMap', () => {
    it('should map the "empty" location to the correct document request', () => {
      const {doc} = getServices();
      doc.data$.subscribe();
      httpMock.expectOne(CONTENT_URL_PREFIX + 'index.json');
      expect().nothing();
    });
    it('should map the "folder" locations to the correct document request', () => {
      const {doc} = getServices('guide');
      doc.data$.subscribe();
      httpMock.expectOne(CONTENT_URL_PREFIX + 'guide.json');
      expect().nothing();
    });
  });
});
