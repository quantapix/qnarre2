import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {QnarreComp} from './qnarre';

describe('QnarreComp', () => {
  let component: QnarreComp;
  let fixture: ComponentFixture<QnarreComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [QnarreComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QnarreComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
