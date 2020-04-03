import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CompatItemComp} from './compat-item.comp';

describe('CompatItemComp', () => {
  let component: CompatItemComp;
  let fixture: ComponentFixture<CompatItemComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompatItemComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CompatItemComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
