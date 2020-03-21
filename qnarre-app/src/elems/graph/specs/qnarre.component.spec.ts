import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {QnarreComponent} from '../qnarre.component';

describe('QnarreComponent', () => {
  let component: QnarreComponent;
  let fixture: ComponentFixture<QnarreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [QnarreComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QnarreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
