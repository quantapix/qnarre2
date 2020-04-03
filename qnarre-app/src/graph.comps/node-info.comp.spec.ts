import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NodeInfoComp} from './node-info.comp';

describe('NodeInfoComp', () => {
  let component: NodeInfoComp;
  let fixture: ComponentFixture<NodeInfoComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NodeInfoComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeInfoComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
