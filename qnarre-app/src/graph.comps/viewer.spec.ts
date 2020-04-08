import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {GraphComp} from './viewer';

describe('GraphComp', () => {
  let component: GraphComp;
  let fixture: ComponentFixture<GraphComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GraphComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
