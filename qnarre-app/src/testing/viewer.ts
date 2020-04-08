import {Component, NgModule, ViewChild} from '@angular/core';
import {Title, Meta} from '@angular/platform-browser';

import {Observable} from 'rxjs';

import {Contents} from '../services/docs';
import {ViewerComp} from '../docs.comps/viewer';
import {LogService} from '../app/log.serv';
import {TocService} from '../services/toc';
import {MockLog} from './log';
import {ElemService} from '../app/elem.serv';

export class TestViewerComp extends ViewerComp {
  curr: HTMLElement;
  next: HTMLElement;

  prepare(_target: HTMLElement, _id: string): () => void {
    return null as any;
  }

  render(_doc: Contents): Observable<void> {
    return null as any;
  }

  swapViews(_onInsertedCb?: () => void): Observable<void> {
    return null as any;
  }
}

@Component({
  selector: 'qnr-test',
  template: '<qnr-viewer [doc]="doc">Test Component</qnr-viewer>'
})
export class TestParentComponent {
  doc?: Contents;
  @ViewChild(ViewerComp, {static: true}) viewer: ViewerComp;
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
  unsubscribeSpies: jasmine.Spy[] = [];
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
