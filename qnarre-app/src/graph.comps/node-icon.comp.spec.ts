import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NodeIconComp} from './node-icon.comp';

describe('NodeIconComp', () => {
  let c: NodeIconComp;
  let f: ComponentFixture<NodeIconComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NodeIconComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    f = TestBed.createComponent(NodeIconComp);
    c = f.componentInstance;
    f.detectChanges();
  });

  it('should create', () => {
    expect(c).toBeTruthy();
  });
});
