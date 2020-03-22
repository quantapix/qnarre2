import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MinimapComponent} from './minimap.component';

describe('GraphMinimapComponent', () => {
  let c: MinimapComponent;
  let f: ComponentFixture<MinimapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MinimapComponent]
    }).compileComponents();
  }));
  beforeEach(() => {
    f = TestBed.createComponent(MinimapComponent);
    c = f.componentInstance;
    f.detectChanges();
  });
  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
