import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BehaviorSubject} from 'rxjs';

import {TopMenuComp} from './top';
import {NavService, Views} from '../services/nav';

describe('TopMenuComp', () => {
  let c: TopMenuComp;
  let f: ComponentFixture<TopMenuComp>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TopMenuComp],
      providers: [{provide: NavService, useClass: TestNavigationService}]
    });
  });
  beforeEach(() => {
    f = TestBed.createComponent(TopMenuComp);
    c = f.componentInstance;
    f.detectChanges();
  });
  it('should create', () => {
    expect(c).toBeTruthy();
  });
});

class TestNavigationService {
  navJson = {
    TopBar: [
      {url: 'api', title: 'API'},
      {url: 'features', title: 'Features'}
    ]
  };

  navViews = new BehaviorSubject<Views>(this.navJson);
}
