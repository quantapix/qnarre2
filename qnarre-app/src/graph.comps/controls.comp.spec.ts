import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ControlsComp} from './controls.comp';

describe('ControlsComp', () => {
  let c: ControlsComp;
  let f: ComponentFixture<ControlsComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ControlsComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    f = TestBed.createComponent(ControlsComp);
    c = f.componentInstance;
    f.detectChanges();
  });

  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
