import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NodeListItemComp} from './node-item.comp';

describe('NodeListItemComp', () => {
  let component: NodeListItemComp;
  let fixture: ComponentFixture<NodeListItemComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NodeListItemComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeListItemComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
