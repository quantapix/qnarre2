import {Component, NgModule, ViewChild} from '@angular/core';
import {Title, Meta} from '@angular/platform-browser';

import {Observable} from 'rxjs';

import {Contents} from '../services/docs.service';
import {ViewerComponent} from '../comps/viewer.component';
import {LoggerService} from '../services/logger.service';
import {TocService} from '../services/toc.service';
import {MockLogger} from './logger.service';
import {ElemsLoader} from '../elems/loader';

export class TestViewerComponent extends ViewerComponent {
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
  @ViewChild(ViewerComponent, {static: true}) viewer: ViewerComponent;
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

export class MockElemsLoader {
  loadContainedCustomElements = jasmine.createSpy(
    'MockElemsLoader#loadContainedCustomElements'
  );
}

@NgModule({
  declarations: [TestViewerComponent, TestParentComponent],
  providers: [
    {provide: Logger, useClass: MockLogger},
    {provide: Title, useClass: MockTitle},
    {provide: Meta, useClass: MockMeta},
    {provide: TocService, useClass: MockTocService},
    {provide: ElemsLoader, useClass: MockElemsLoader}
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
