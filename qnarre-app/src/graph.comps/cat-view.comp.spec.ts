import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CatViewComp} from './cat-view.comp';

describe('CatViewComp', () => {
  let component: CatViewComp;
  let fixture: ComponentFixture<CatViewComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CatViewComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CatViewComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
