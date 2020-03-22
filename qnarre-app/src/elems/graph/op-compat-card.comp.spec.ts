import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {OpCompatCardComponent} from './op-compat-card.comp';

describe('OpCompatCardComponent', () => {
  let component: OpCompatCardComponent;
  let fixture: ComponentFixture<OpCompatCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [OpCompatCardComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OpCompatCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
