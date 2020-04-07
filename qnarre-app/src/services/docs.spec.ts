import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Subscription} from 'rxjs';

import {LocService} from './loc';
import {MockLocService} from '../testing/loc';
import {LogService} from './log';
import {MockLog} from '../services/log';
import {DocsService, Contents, FETCHING_ERROR, FILE_NOT_FOUND} from './docs';

const CONTENT_URL_PREFIX = 'generated/docs/';

describe('DocsService', () => {
  let httpMock: HttpTestingController;

  function createInjector(url: string) {
    return TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DocsService,
        {
          provide: LocService,
          useFactory: () => new MockLocService(url)
        },
        {provide: LogService, useClass: MockLog}
      ]
    });
  }

  function getServices(url = '') {
    const injector = createInjector(url);
    httpMock = injector.inject(HttpTestingController);
    return {
      locService: (injector.inject(LocService) as any) as MockLocService,
      docService: (injector.inject(DocsService) as any) as DocsService,
      logger: (injector.inject(LogService) as any) as MockLog
    };
  }

  afterEach(() => httpMock.verify());

  describe('currentDocument', () => {
    it('should fetch a document for the initial location', () => {
      const {docService} = getServices('initial/doc');
      docService.doc.subscribe();
      httpMock.expectOne(CONTENT_URL_PREFIX + 'initial/doc.json');
      expect().nothing(); // Prevent jasmine from complaining about no expectations.
    });
    it('should emit a document each time the location changes', () => {
      let latestDocument: Contents | undefined;
      const doc0 = {contents: 'doc 0', id: 'initial/doc'};
      const doc1 = {contents: 'doc 1', id: 'new/doc'};
      const {docService, locService} = getServices('initial/doc');
      docService.doc.subscribe(doc => (latestDocument = doc));
      expect(latestDocument).toBeUndefined();
      httpMock.expectOne({}).flush(doc0);
      expect(latestDocument).toEqual(doc0);
      locService.go('new/doc');
      httpMock.expectOne({}).flush(doc1);
      expect(latestDocument).toEqual(doc1);
    });
    it('should emit the not-found document if the document is not found on the server', () => {
      let currentDocument: Contents | undefined;
      const notFoundDoc = {
        id: FILE_NOT_FOUND,
        contents: '<h1>Page Not Found</h1>'
      };
      const {docService, logger} = getServices('missing/doc');
      docService.doc.subscribe(doc => (currentDocument = doc));
      httpMock
        .expectOne({})
        .flush(null, {status: 404, statusText: 'NOT FOUND'});
      expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
      expect(logger.output.error[0][0].message).toEqual(
        `Document file not found at 'missing/doc'`
      );
      logger.output.error = [];
      httpMock
        .expectOne(CONTENT_URL_PREFIX + 'file-not-found.json')
        .flush(notFoundDoc);
      expect(logger.output.error).toEqual([]); // does not report repeate errors
      expect(currentDocument).toEqual(notFoundDoc);
    });
    it('should emit a hard-coded not-found document if the not-found document is not found on the server', () => {
      let currentDocument: Contents | undefined;
      const hardCodedNotFoundDoc = {
        contents: 'Document not found',
        id: FILE_NOT_FOUND
      };
      const nextDoc = {contents: 'Next Doc', id: 'new/doc'};
      const {docService, locService} = getServices(FILE_NOT_FOUND);
      docService.doc.subscribe(doc => (currentDocument = doc));
      httpMock
        .expectOne({})
        .flush(null, {status: 404, statusText: 'NOT FOUND'});
      expect(currentDocument).toEqual(hardCodedNotFoundDoc);
      locService.go('new/doc');
      httpMock.expectOne({}).flush(nextDoc);
      expect(currentDocument).toEqual(nextDoc);
    });
    it('should use a hard-coded error doc if the request fails (but not cache it)', () => {
      let latestDocument!: Contents;
      const doc1 = {contents: 'doc 1'} as Contents;
      const doc2 = {contents: 'doc 2'} as Contents;
      const {docService, locService, logger} = getServices('initial/doc');
      docService.doc.subscribe(doc => (latestDocument = doc));
      httpMock
        .expectOne({})
        .flush(null, {status: 500, statusText: 'Server Error'});
      expect(latestDocument.id).toEqual(FETCHING_ERROR);
      expect(latestDocument.contents).toContain(
        'We are unable to retrieve the "initial/doc" page at this time.'
      );
      expect(logger.output.error).toEqual([[jasmine.any(Error)]]);
      expect(logger.output.error[0][0].message).toEqual(
        `Error fetching document 'initial/doc': (Http failure response for generated/docs/initial/doc.json: 500 Server Error)`
      );
      locService.go('new/doc');
      httpMock.expectOne({}).flush(doc1);
      expect(latestDocument).toEqual(jasmine.objectContaining(doc1));
      locService.go('initial/doc');
      httpMock.expectOne({}).flush(doc2);
      expect(latestDocument).toEqual(jasmine.objectContaining(doc2));
    });
    it('should not crash the app if the response is invalid JSON', () => {
      let latestDocument!: Contents;
      const doc1 = {contents: 'doc 1'} as Contents;
      const {docService, locService} = getServices('initial/doc');
      docService.doc.subscribe(doc => (latestDocument = doc));
      httpMock.expectOne({}).flush('this is invalid JSON');
      expect(latestDocument.id).toEqual(FETCHING_ERROR);
      locService.go('new/doc');
      httpMock.expectOne({}).flush(doc1);
      expect(latestDocument).toEqual(jasmine.objectContaining(doc1));
    });
    it('should not make a request to the server if the doc is in the cache already', () => {
      let latestDocument!: Contents;
      let subscription: Subscription;
      const doc0 = {contents: 'doc 0'} as Contents;
      const doc1 = {contents: 'doc 1'} as Contents;
      const {docService, locService} = getServices('url/0');
      subscription = docService.doc.subscribe(doc => (latestDocument = doc));
      httpMock.expectOne({}).flush(doc0);
      expect(latestDocument).toEqual(jasmine.objectContaining(doc0));
      subscription.unsubscribe();
      subscription = docService.doc.subscribe(doc => (latestDocument = doc));
      locService.go('url/1');
      httpMock.expectOne({}).flush(doc1);
      expect(latestDocument).toEqual(jasmine.objectContaining(doc1));
      subscription.unsubscribe();
      subscription = docService.doc.subscribe(doc => (latestDocument = doc));
      locService.go('url/0');
      httpMock.expectNone({});
      expect(latestDocument).toEqual(jasmine.objectContaining(doc0));
      subscription.unsubscribe();
      subscription = docService.doc.subscribe(doc => (latestDocument = doc));
      locService.go('url/1');
      httpMock.expectNone({});
      expect(latestDocument).toEqual(jasmine.objectContaining(doc1));
      subscription.unsubscribe();
    });
  });

  describe('computeMap', () => {
    it('should map the "empty" location to the correct document request', () => {
      const {docService} = getServices();
      docService.doc.subscribe();
      httpMock.expectOne(CONTENT_URL_PREFIX + 'index.json');
      expect().nothing();
    });
    it('should map the "folder" locations to the correct document request', () => {
      const {docService} = getServices('guide');
      docService.doc.subscribe();
      httpMock.expectOne(CONTENT_URL_PREFIX + 'guide.json');
      expect().nothing();
    });
  });
});
