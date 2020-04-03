import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {IconComp} from './icon.comp';

describe('IconComp', () => {
  let c: IconComp;
  let f: ComponentFixture<IconComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [IconComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    f = TestBed.createComponent(IconComp);
    c = f.componentInstance;
    f.detectChanges();
  });

  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
