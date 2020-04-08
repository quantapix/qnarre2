/* eslint-disable @typescript-eslint/unbound-method */
import {Component, NgModule, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Meta, Title} from '@angular/platform-browser';

import {Observable, asapScheduler, of} from 'rxjs';

import {NOT_FOUND, FETCH_ERR} from './service';
import {LogService, MockLog} from '../app/log.serv';
import {ElemsModule} from '../app/elem';
import {TocService} from '../app/toc.serv';
import {ElemService} from '../app/elem.serv';
import {ViewerComp, NO_ANIMATIONS} from './viewer';

import {Data} from './service';

describe('ViewerComp', () => {
  let parentFixture: ComponentFixture<TestParentComponent>;
  let parent: TestParentComponent;
  let elem: HTMLElement;
  let viewer: TestViewerComp;

  const safeFlushAsapScheduler = () =>
    asapScheduler.actions.length && asapScheduler.flush();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ElemsModule, TestModule]
    });
    parentFixture = TestBed.createComponent(TestParentComponent);
    parent = parentFixture.componentInstance;
    parentFixture.detectChanges();
    elem = parentFixture.debugElement.children[0].nativeElement;
    viewer = parent.viewer as any;
  });
  it('should create a `DocViewer`', () => {
    expect(viewer).toEqual(jasmine.any(ViewerComp));
  });
  describe('#doc', () => {
    let spy: any;
    const setCurr = (d: TestParentComponent['data']) => {
      parent.data = d && {k: 'fizz/buzz', ...d};
      parentFixture.detectChanges();
      safeFlushAsapScheduler();
    };
    beforeEach(
      () => (spy = spyOn(viewer, 'render').and.callFake(() => of(undefined)))
    );
    it('should render the new document', () => {
      setCurr({v: 'foo', k: 'bar'});
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.calls.mostRecent().args).toEqual([{k: 'bar', v: 'foo'}]);
      setCurr({v: undefined, k: 'baz'});
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.calls.mostRecent().args).toEqual([{k: 'baz', contents: null}]);
    });
    it('should unsubscribe from the previous "render" observable upon new document', () => {
      const obs = new ObservableWithSubscriptionSpies();
      spy.and.returnValue(obs);

      setCurr({v: 'foo', k: 'bar'});
      expect(obs.subscribeSpy).toHaveBeenCalledTimes(1);
      expect(obs.unsubscribeSpies[0]).not.toHaveBeenCalled();

      setCurr({v: 'baz', k: 'qux'});
      expect(obs.subscribeSpy).toHaveBeenCalledTimes(2);
      expect(obs.unsubscribeSpies[0]).toHaveBeenCalledTimes(1);
    });
    it('should ignore falsy document values', () => {
      setCurr(undefined);
      expect(spy).not.toHaveBeenCalled();
      setCurr(undefined);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('#ngOnDestroy()', () => {
    it('should stop responding to document changes', () => {
      const spy = spyOn(viewer, 'render').and.callFake(() => of(undefined));
      expect(spy).not.toHaveBeenCalled();
      viewer.data = {v: 'Some content', k: 'some-id'};
      safeFlushAsapScheduler();
      expect(spy).toHaveBeenCalledTimes(1);
      viewer.ngOnDestroy();
      viewer.data = {v: 'Other content', k: 'other-id'};
      safeFlushAsapScheduler();
      expect(spy).toHaveBeenCalledTimes(1);
      viewer.data = {v: 'More content', k: 'more-id'};
      safeFlushAsapScheduler();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('#prepareTitleAndToc()', () => {
    const EMPTY_DOC = '';
    const DOC_WITHOUT_H1 = 'Some content';
    const DOC_WITH_H1 = '<h1>Features</h1>Some content';
    const DOC_WITH_NO_TOC_H1 = '<h1 class="no-toc">Features</h1>Some content';
    const DOC_WITH_EMBEDDED_TOC =
      '<h1>Features</h1><qnr-toc class="embedded"></qnr-toc>Some content';
    const DOC_WITH_EMBEDDED_TOC_WITHOUT_H1 =
      '<qnr-toc class="embedded"></qnr-toc>Some content';
    const DOC_WITH_EMBEDDED_TOC_WITH_NO_TOC_H1 =
      '<qnr-toc class="embedded"></qnr-toc>Some content';
    const DOC_WITH_HIDDEN_H1_CONTENT =
      '<h1><i style="visibility: hidden">link</i>Features</h1>Some content';
    let title: MockTitle;
    let toc: MockTocService;
    let target: HTMLElement;

    const getTocEl = () => target.querySelector('qnr-toc');
    const prep = (contents: string, docId = '') => {
      target.innerHTML = contents;
      return viewer.prepare(target, docId);
    };
    const add = (contents: string, docId = '') => {
      const addTitleAndToc = prep(contents, docId);
      return addTitleAndToc();
    };
    beforeEach(() => {
      title = (TestBed.inject(Title) as unknown) as MockTitle;
      toc = (TestBed.inject(TocService) as unknown) as MockTocService;
      target = document.createElement('div');
      document.body.appendChild(target); // Required for `innerText` to work as expected.
    });
    afterEach(() => document.body.removeChild(target));
    it('should return a function for doing the actual work', () => {
      const addTitleAndToc = prep(DOC_WITH_H1);
      expect(getTocEl()).toBeTruthy();
      expect(title.setTitle).not.toHaveBeenCalled();
      expect(toc.reset).not.toHaveBeenCalled();
      expect(toc.genToc).not.toHaveBeenCalled();
      addTitleAndToc();
      expect(title.setTitle).toHaveBeenCalledTimes(1);
      expect(toc.reset).toHaveBeenCalledTimes(1);
      expect(toc.genToc).toHaveBeenCalledTimes(1);
    });

    describe('(title)', () => {
      it('should set the title if there is an `<h1>` heading', () => {
        add(DOC_WITH_H1);
        expect(title.setTitle).toHaveBeenCalledWith('Angular - Features');
      });
      it('should set the title if there is a `.no-toc` `<h1>` heading', () => {
        add(DOC_WITH_NO_TOC_H1);
        expect(title.setTitle).toHaveBeenCalledWith('Angular - Features');
      });
      it('should set the default title if there is no `<h1>` heading', () => {
        add(DOC_WITHOUT_H1);
        expect(title.setTitle).toHaveBeenCalledWith('Angular');
        add(EMPTY_DOC);
        expect(title.setTitle).toHaveBeenCalledWith('Angular');
      });
      it('should not include hidden content of the `<h1>` heading in the title', () => {
        add(DOC_WITH_HIDDEN_H1_CONTENT);
        expect(title.setTitle).toHaveBeenCalledWith('Angular - Features');
      });
      it('should fall back to `textContent` if `innerText` is not available', () => {
        const querySelector = target.querySelector;
        spyOn(target, 'querySelector').and.callFake((selector: string) => {
          const elem = querySelector.call(target, selector);
          return (
            elem &&
            Object.defineProperties(elem, {
              innerText: {value: undefined},
              textContent: {value: 'Text Content'}
            })
          );
        });
        add(DOC_WITH_HIDDEN_H1_CONTENT);
        expect(title.setTitle).toHaveBeenCalledWith('Angular - Text Content');
      });
      it('should still use `innerText` if available but empty', () => {
        const querySelector = target.querySelector;
        spyOn(target, 'querySelector').and.callFake((selector: string) => {
          const elem = querySelector.call(target, selector);
          return (
            elem &&
            Object.defineProperties(elem, {
              innerText: {value: ''},
              textContent: {value: 'Text Content'}
            })
          );
        });
        add(DOC_WITH_HIDDEN_H1_CONTENT);
        expect(title.setTitle).toHaveBeenCalledWith('Angular');
      });
    });

    describe('(ToC)', () => {
      describe('needed', () => {
        it('should add an embedded ToC element if there is an `<h1>` heading', () => {
          prep(DOC_WITH_H1);
          const tocEl = getTocEl()!;
          expect(tocEl).toBeTruthy();
          expect(tocEl.classList.contains('embedded')).toBe(true);
        });
        it('should not add a second ToC element if there a hard coded one in place', () => {
          prep(DOC_WITH_EMBEDDED_TOC);
          expect(target.querySelectorAll('qnr-toc').length).toEqual(1);
        });
      });

      describe('not needed', () => {
        it('should not add a ToC element if there is a `.no-toc` `<h1>` heading', () => {
          prep(DOC_WITH_NO_TOC_H1);
          expect(getTocEl()).toBeFalsy();
        });
        it('should not add a ToC element if there is no `<h1>` heading', () => {
          prep(DOC_WITHOUT_H1);
          expect(getTocEl()).toBeFalsy();
          prep(EMPTY_DOC);
          expect(getTocEl()).toBeFalsy();
        });
        it('should remove ToC a hard coded one', () => {
          prep(DOC_WITH_EMBEDDED_TOC_WITHOUT_H1);
          expect(getTocEl()).toBeFalsy();
          prep(DOC_WITH_EMBEDDED_TOC_WITH_NO_TOC_H1);
          expect(getTocEl()).toBeFalsy();
        });
      });
      it('should generate ToC entries if there is an `<h1>` heading', () => {
        add(DOC_WITH_H1, 'foo');
        expect(toc.genToc).toHaveBeenCalledTimes(1);
        expect(toc.genToc).toHaveBeenCalledWith(target, 'foo');
      });
      it('should not generate ToC entries if there is a `.no-toc` `<h1>` heading', () => {
        add(DOC_WITH_NO_TOC_H1);
        expect(toc.genToc).not.toHaveBeenCalled();
      });
      it('should not generate ToC entries if there is no `<h1>` heading', () => {
        add(DOC_WITHOUT_H1);
        add(EMPTY_DOC);
        expect(toc.genToc).not.toHaveBeenCalled();
      });
      it('should always reset the ToC (before generating the new one)', () => {
        add(DOC_WITH_H1, 'foo');
        expect(toc.reset).toHaveBeenCalledTimes(1);
        expect(toc.reset).toHaveBeenCalledBefore(toc.genToc);
        expect(toc.genToc).toHaveBeenCalledWith(target, 'foo');
        toc.genToc.calls.reset();
        add(DOC_WITH_NO_TOC_H1, 'bar');
        expect(toc.reset).toHaveBeenCalledTimes(2);
        expect(toc.genToc).not.toHaveBeenCalled();
        add(DOC_WITHOUT_H1, 'baz');
        expect(toc.reset).toHaveBeenCalledTimes(3);
        expect(toc.genToc).not.toHaveBeenCalled();
        add(EMPTY_DOC, 'qux');
        expect(toc.reset).toHaveBeenCalledTimes(4);
        expect(toc.genToc).not.toHaveBeenCalled();
      });
    });
  });

  describe('#render()', () => {
    let prep: any;
    let swapViewsSpy: any;
    let loadElementsSpy: any;
    const doRender = (v: string | undefined, k = 'foo') =>
      viewer.render({v, k}).toPromise();
    beforeEach(() => {
      const ElemService = (TestBed.inject(ElemService) as Partial<
        ElemService
      >) as MockElemService;
      loadElementsSpy = ElemService.loadContainedCustomElements.and.callFake(
        () => of(undefined)
      );
      prep = spyOn(viewer, 'prepare');
      swapViewsSpy = spyOn(viewer, 'swapViews').and.callFake(() =>
        of(undefined)
      );
    });
    it('should return an `Observable`', () => {
      expect(viewer.render({v: '', k: ''})).toEqual(jasmine.any(Observable));
    });
    describe('(contents, title, ToC)', () => {
      beforeEach(() => swapViewsSpy.and.callThrough());
      it('should display the document contents', async () => {
        const contents = '<h1>Hello,</h1> <div>world!</div>';
        await doRender(contents);
        expect(elem.innerHTML).toContain(contents);
        expect(elem.textContent).toBe('Hello, world!');
      });
      it('should display nothing if the document has no contents', async () => {
        await doRender('Test');
        expect(elem.textContent).toBe('Test');

        await doRender('');
        expect(elem.textContent).toBe('');
        viewer.curr.innerHTML = 'Test';
        expect(elem.textContent).toBe('Test');
        await doRender(undefined);
        expect(elem.textContent).toBe('');
      });

      it('should prepare the title and ToC (before embedding components)', async () => {
        prep.and.callFake((target: HTMLElement, docId: string) => {
          expect(target.innerHTML).toBe('Some content');
          expect(docId).toBe('foo');
        });
        await doRender('Some content', 'foo');
        expect(prep).toHaveBeenCalledTimes(1);
        expect(prep).toHaveBeenCalledBefore(loadElementsSpy);
      });
      it('should set the title and ToC (after the content has been set)', async () => {
        const addTitleAndTocSpy = jasmine.createSpy('addTitleAndToc');
        prep.and.returnValue(addTitleAndTocSpy);
        addTitleAndTocSpy.and.callFake(() =>
          expect(elem.textContent).toBe('Foo content')
        );
        await doRender('Foo content');
        expect(addTitleAndTocSpy).toHaveBeenCalledTimes(1);
        addTitleAndTocSpy.and.callFake(() =>
          expect(elem.textContent).toBe('Bar content')
        );
        await doRender('Bar content');
        expect(addTitleAndTocSpy).toHaveBeenCalledTimes(2);
        addTitleAndTocSpy.and.callFake(() => expect(elem.textContent).toBe(''));
        await doRender('');
        expect(addTitleAndTocSpy).toHaveBeenCalledTimes(3);
        addTitleAndTocSpy.and.callFake(() =>
          expect(elem.textContent).toBe('Qux content')
        );
        await doRender('Qux content');
        expect(addTitleAndTocSpy).toHaveBeenCalledTimes(4);
      });
      it('should remove the "noindex" meta tag if the document is valid', async () => {
        await doRender('foo', 'bar');
        expect(TestBed.inject(Meta).removeTag).toHaveBeenCalledWith(
          'name="robots"'
        );
      });
      it('should add the "noindex" meta tag if the document is 404', async () => {
        await doRender('missing', NOT_FOUND);
        expect(TestBed.inject(Meta).addTag).toHaveBeenCalledWith({
          name: 'robots',
          content: 'noindex'
        });
      });
      it('should add a "noindex" meta tag if the document fetching fails', async () => {
        await doRender('error', FETCH_ERR);
        expect(TestBed.inject(Meta).addTag).toHaveBeenCalledWith({
          name: 'robots',
          content: 'noindex'
        });
      });
    });

    describe('(embedding components)', () => {
      it('should embed components', async () => {
        await doRender('Some content');
        expect(loadElementsSpy).toHaveBeenCalledTimes(1);
        expect(loadElementsSpy).toHaveBeenCalledWith(viewer.next);
      });
      it('should attempt to embed components even if the document is empty', async () => {
        await doRender('');
        await doRender(undefined);
        expect(loadElementsSpy).toHaveBeenCalledTimes(2);
        expect(loadElementsSpy.calls.argsFor(0)).toEqual([viewer.next]);
        expect(loadElementsSpy.calls.argsFor(1)).toEqual([viewer.next]);
      });
      it('should unsubscribe from the previous "embed" observable when unsubscribed from', () => {
        const obs = new ObservableWithSubscriptionSpies();
        loadElementsSpy.and.returnValue(obs);
        const renderObservable = viewer.render({
          v: 'Some content',
          k: 'foo'
        });
        const subscription = renderObservable.subscribe();
        expect(obs.subscribeSpy).toHaveBeenCalledTimes(1);
        expect(obs.unsubscribeSpies[0]).not.toHaveBeenCalled();
        subscription.unsubscribe();
        expect(obs.subscribeSpy).toHaveBeenCalledTimes(1);
        expect(obs.unsubscribeSpies[0]).toHaveBeenCalledTimes(1);
      });
    });

    describe('(swapping views)', () => {
      it('should still swap the views if the document is empty', async () => {
        await doRender('');
        expect(swapViewsSpy).toHaveBeenCalledTimes(1);
        await doRender(undefined);
        expect(swapViewsSpy).toHaveBeenCalledTimes(2);
      });
      it('should pass the `addTitleAndToc` callback', async () => {
        const addTitleAndTocSpy = jasmine.createSpy('addTitleAndToc');
        prep.and.returnValue(addTitleAndTocSpy);
        await doRender('<div></div>');
        expect(swapViewsSpy).toHaveBeenCalledWith(addTitleAndTocSpy);
      });
      it('should unsubscribe from the previous "swap" observable when unsubscribed from', () => {
        const obs = new ObservableWithSubscriptionSpies();
        swapViewsSpy.and.returnValue(obs);
        const renderObservable = viewer.render({
          v: 'Hello, world!',
          k: 'foo'
        });
        const subscription = renderObservable.subscribe();
        expect(obs.subscribeSpy).toHaveBeenCalledTimes(1);
        expect(obs.unsubscribeSpies[0]).not.toHaveBeenCalled();
        subscription.unsubscribe();
        expect(obs.subscribeSpy).toHaveBeenCalledTimes(1);
        expect(obs.unsubscribeSpies[0]).toHaveBeenCalledTimes(1);
      });
    });

    describe('(on error) should clean up, log the error and recover', () => {
      let log: MockLog;
      beforeEach(() => {
        log = (TestBed.inject(LogService) as unknown) as MockLog;
      });
      it('when `prep()` fails', async () => {
        const error = Error('Typical `prepareTitleAndToc()` error');
        prep.and.callFake(() => {
          expect(viewer.next.innerHTML).not.toBe('');
          throw error;
        });
        await doRender('Some content', 'foo');
        expect(prep).toHaveBeenCalledTimes(1);
        expect(swapViewsSpy).not.toHaveBeenCalled();
        expect(viewer.next.innerHTML).toBe('');
        expect(log.out.fail).toEqual([[jasmine.any(Error)]]);
        expect(log.out.fail[0][0].message).toEqual(
          `[DocViewer] Error preparing document 'foo': ${error.stack}`
        );
        expect(TestBed.inject(Meta).addTag).toHaveBeenCalledWith({
          name: 'robots',
          content: 'noindex'
        });
      });
      it('when `EmbedComponentsService.embedInto()` fails', async () => {
        const error = Error('Typical `embedInto()` error');
        loadElementsSpy.and.callFake(() => {
          expect(viewer.next.innerHTML).not.toBe('');
          throw error;
        });
        await doRender('Some content', 'bar');
        expect(prep).toHaveBeenCalledTimes(1);
        expect(loadElementsSpy).toHaveBeenCalledTimes(1);
        expect(swapViewsSpy).not.toHaveBeenCalled();
        expect(viewer.next.innerHTML).toBe('');
        expect(log.out.fail).toEqual([[jasmine.any(Error)]]);
        expect(TestBed.inject(Meta).addTag).toHaveBeenCalledWith({
          name: 'robots',
          content: 'noindex'
        });
      });
      it('when `swapViews()` fails', async () => {
        const error = Error('Typical `swapViews()` error');
        swapViewsSpy.and.callFake(() => {
          expect(viewer.next.innerHTML).not.toBe('');
          throw error;
        });
        await doRender('Some content', 'qux');
        expect(prep).toHaveBeenCalledTimes(1);
        expect(swapViewsSpy).toHaveBeenCalledTimes(1);
        expect(viewer.next.innerHTML).toBe('');
        expect(log.out.fail).toEqual([[jasmine.any(Error)]]);
        expect(log.out.fail[0][0].message).toEqual(
          `[DocViewer] Error preparing document 'qux': ${error.stack}`
        );
        expect(TestBed.inject(Meta).addTag).toHaveBeenCalledWith({
          name: 'robots',
          content: 'noindex'
        });
      });
      it('when something fails with non-Error', async () => {
        const error = 'Typical string error';
        swapViewsSpy.and.callFake(() => {
          expect(viewer.next.innerHTML).not.toBe('');
          throw error;
        });
        await doRender('Some content', 'qux');
        expect(swapViewsSpy).toHaveBeenCalledTimes(1);
        expect(viewer.next.innerHTML).toBe('');
        expect(log.out.fail).toEqual([[jasmine.any(Error)]]);
        expect(log.out.fail[0][0].message).toEqual(
          `[DocViewer] Error preparing document 'qux': ${error}`
        );
        expect(TestBed.inject(Meta).addTag).toHaveBeenCalledWith({
          name: 'robots',
          content: 'noindex'
        });
      });
    });

    describe('(events)', () => {
      it('should emit `docReady` after loading elements', async () => {
        const onDocReadySpy = jasmine.createSpy('onDocReady');
        viewer.ready.subscribe(onDocReadySpy);
        await doRender('Some content');
        expect(onDocReadySpy).toHaveBeenCalledTimes(1);
        expect(loadElementsSpy).toHaveBeenCalledBefore(onDocReadySpy);
      });
      it('should emit `docReady` before swapping views', async () => {
        const onDocReadySpy = jasmine.createSpy('onDocReady');
        viewer.ready.subscribe(onDocReadySpy);
        await doRender('Some content');
        expect(onDocReadySpy).toHaveBeenCalledTimes(1);
        expect(onDocReadySpy).toHaveBeenCalledBefore(swapViewsSpy);
      });
      it('should emit `docRendered` after swapping views', async () => {
        const onDocRenderedSpy = jasmine.createSpy('onDocRendered');
        viewer.rendered.subscribe(onDocRenderedSpy);
        await doRender('Some content');
        expect(onDocRenderedSpy).toHaveBeenCalledTimes(1);
        expect(swapViewsSpy).toHaveBeenCalledBefore(onDocRenderedSpy);
      });
    });
  });

  describe('#swapViews()', () => {
    let oldCurr: HTMLElement;
    let oldnext: HTMLElement;
    const doSwapViews = (cb?: () => void) => viewer.swapViews(cb).toPromise();
    beforeEach(() => {
      oldCurr = viewer.curr;
      oldnext = viewer.next;
      oldCurr.innerHTML = 'Current view';
      oldnext.innerHTML = 'Next view';
      elem.appendChild(oldCurr);
      expect(elem.contains(oldCurr)).toBe(true);
      expect(elem.contains(oldnext)).toBe(false);
    });
    [true, false].forEach(animations => {
      describe(`(animations: ${animations})`, () => {
        beforeEach(() => (ViewerComp.animations = animations));
        afterEach(() => (ViewerComp.animations = true));
        [true, false].forEach(noAnimations => {
          describe(`(.${NO_ANIMATIONS}: ${noAnimations})`, () => {
            beforeEach(() =>
              elem.classList[noAnimations ? 'add' : 'remove'](NO_ANIMATIONS)
            );
            it('should return an observable', done => {
              viewer.swapViews().subscribe(done, done.fail);
            });
            it('should swap the views', async () => {
              await doSwapViews();
              expect(elem.contains(oldCurr)).toBe(false);
              expect(elem.contains(oldnext)).toBe(true);
              expect(viewer.curr).toBe(oldnext);
              expect(viewer.next).toBe(oldCurr);
              await doSwapViews();
              expect(elem.contains(oldCurr)).toBe(true);
              expect(elem.contains(oldnext)).toBe(false);
              expect(viewer.curr).toBe(oldCurr);
              expect(viewer.next).toBe(oldnext);
            });
            it('should emit `docRemoved` after removing the leaving view', async () => {
              const onDocRemovedSpy = jasmine
                .createSpy('onDocRemoved')
                .and.callFake(() => {
                  expect(elem.contains(oldCurr)).toBe(false);
                  expect(elem.contains(oldnext)).toBe(false);
                });
              viewer.removed.subscribe(onDocRemovedSpy);
              expect(elem.contains(oldCurr)).toBe(true);
              expect(elem.contains(oldnext)).toBe(false);
              await doSwapViews();
              expect(onDocRemovedSpy).toHaveBeenCalledTimes(1);
              expect(elem.contains(oldCurr)).toBe(false);
              expect(elem.contains(oldnext)).toBe(true);
            });

            it('should not emit `docRemoved` if the leaving view is already removed', async () => {
              const onDocRemovedSpy = jasmine.createSpy('onDocRemoved');
              viewer.removed.subscribe(onDocRemovedSpy);
              elem.removeChild(oldCurr);
              await doSwapViews();
              expect(onDocRemovedSpy).not.toHaveBeenCalled();
            });
            it('should emit `docInserted` after inserting the entering view', async () => {
              const onDocInsertedSpy = jasmine
                .createSpy('onDocInserted')
                .and.callFake(() => {
                  expect(elem.contains(oldCurr)).toBe(false);
                  expect(elem.contains(oldnext)).toBe(true);
                });
              viewer.inserted.subscribe(onDocInsertedSpy);
              expect(elem.contains(oldCurr)).toBe(true);
              expect(elem.contains(oldnext)).toBe(false);
              await doSwapViews();
              expect(onDocInsertedSpy).toHaveBeenCalledTimes(1);
              expect(elem.contains(oldCurr)).toBe(false);
              expect(elem.contains(oldnext)).toBe(true);
            });
            it('should call the callback after inserting the entering view', async () => {
              const onInsertedCb = jasmine
                .createSpy('onInsertedCb')
                .and.callFake(() => {
                  expect(elem.contains(oldCurr)).toBe(false);
                  expect(elem.contains(oldnext)).toBe(true);
                });
              const onDocInsertedSpy = jasmine.createSpy('onDocInserted');
              viewer.inserted.subscribe(onDocInsertedSpy);
              expect(elem.contains(oldCurr)).toBe(true);
              expect(elem.contains(oldnext)).toBe(false);
              await doSwapViews(onInsertedCb);
              expect(onInsertedCb).toHaveBeenCalledTimes(1);
              expect(onInsertedCb).toHaveBeenCalledBefore(onDocInsertedSpy);
              expect(elem.contains(oldCurr)).toBe(false);
              expect(elem.contains(oldnext)).toBe(true);
            });
            it('should empty the previous view', async () => {
              await doSwapViews();
              expect(viewer.curr.innerHTML).toBe('Next view');
              expect(viewer.next.innerHTML).toBe('');
              viewer.next.innerHTML = 'Next view 2';
              await doSwapViews();
              expect(viewer.curr.innerHTML).toBe('Next view 2');
              expect(viewer.next.innerHTML).toBe('');
            });
            if (animations && !noAnimations) {
              it('should abort swapping if the returned observable is unsubscribed from', async () => {
                viewer.swapViews().subscribe().unsubscribe();
                await doSwapViews();
                expect(elem.contains(oldCurr)).toBe(false);
                expect(elem.contains(oldnext)).toBe(true);
                expect(viewer.curr).toBe(oldnext);
                expect(viewer.next).toBe(oldCurr);
                expect(viewer.curr.innerHTML).toBe('Next view');
                expect(viewer.next.innerHTML).toBe('');
              });
            } else {
              it('should swap views synchronously when animations are disabled', () => {
                const cbSpy = jasmine.createSpy('cb');
                viewer.swapViews(cbSpy).subscribe();
                expect(cbSpy).toHaveBeenCalledTimes(1);
                expect(elem.contains(oldCurr)).toBe(false);
                expect(elem.contains(oldnext)).toBe(true);
                expect(viewer.curr).toBe(oldnext);
                expect(viewer.next).toBe(oldCurr);
                expect(viewer.curr.innerHTML).toBe('Next view');
                expect(viewer.next.innerHTML).toBe('');
              });
            }
          });
        });
      });
    });
  });
});

export class TestViewerComp extends ViewerComp {
  curr: HTMLElement;
  next: HTMLElement;

  prepare(_target: HTMLElement, _id: string): () => void {
    return null as any;
  }

  render(_doc: Data): Observable<void> {
    return null as any;
  }

  swapViews(_onInsertedCb?: () => void): Observable<void> {
    return null as any;
  }
}

@Component({
  selector: 'qnr-test',
  template: '<qnr-docs-viewer [data]="data">Test Component</qnr-docs-viewer>'
})
export class TestParentComponent {
  data?: Data;
  @ViewChild(ViewerComp, {static: true}) viewer?: ViewerComp;
}

export class MockTitle {
  setTitle = jasmine.createSpy('Title#reset');
}

export class MockMeta {
  addTag = jasmine.createSpy('Meta#addTag');
  removeTag = jasmine.createSpy('Meta#removeTag');
}

export class MockTocService {
  genToc = jasmine.createSpy('TocService#genToc');
  reset = jasmine.createSpy('TocService#reset');
}

export class MockElemService {
  loadContainedCustomElements = jasmine.createSpy(
    'MockElemService#loadContainedCustomElements'
  );
}

@NgModule({
  declarations: [TestViewerComp, TestParentComponent],
  providers: [
    {provide: LogService, useClass: MockLog},
    {provide: Title, useClass: MockTitle},
    {provide: Meta, useClass: MockMeta},
    {provide: TocService, useClass: MockTocService},
    {provide: ElemService, useClass: MockElemService}
  ]
})
export class TestModule {}

export class ObservableWithSubscriptionSpies<T = void> extends Observable<T> {
  unsubscribeSpies = [] as any[];
  subscribeSpy = spyOn(this as Observable<T>, 'subscribe').and.callFake(
    (...args: any[]) => {
      const subscription = super.subscribe(...args);
      const unsubscribeSpy = spyOn(
        subscription,
        'unsubscribe'
      ).and.callThrough();
      this.unsubscribeSpies.push(unsubscribeSpy);
      return subscription;
    }
  );

  constructor(subscriber = () => undefined) {
    super(subscriber);
  }
}
