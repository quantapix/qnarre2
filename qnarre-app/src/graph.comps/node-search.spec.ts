import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NodeSearchComp} from './node-search';

describe('NodeSearchComp', () => {
  let component: NodeSearchComp;
  let fixture: ComponentFixture<NodeSearchComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NodeSearchComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeSearchComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
