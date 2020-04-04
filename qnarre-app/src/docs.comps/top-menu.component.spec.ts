import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BehaviorSubject} from 'rxjs';

import {TopMenuComponent} from './top-menu.component';
import {NavService, NavViews} from '../services/nav';

describe('TopMenuComponent', () => {
  let c: TopMenuComponent;
  let f: ComponentFixture<TopMenuComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TopMenuComponent],
      providers: [{provide: NavService, useClass: TestNavigationService}]
    });
  });
  beforeEach(() => {
    f = TestBed.createComponent(TopMenuComponent);
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

  navViews = new BehaviorSubject<NavViews>(this.navJson);
}
