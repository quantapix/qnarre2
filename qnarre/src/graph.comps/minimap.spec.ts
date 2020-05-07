import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MinimapComp} from './minimap';

describe('GraphMinimapComp', () => {
  let c: MinimapComp;
  let f: ComponentFixture<MinimapComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MinimapComp]
    }).compileComponents();
  }));
  beforeEach(() => {
    f = TestBed.createComponent(MinimapComp);
    c = f.componentInstance;
    f.detectChanges();
  });
  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
