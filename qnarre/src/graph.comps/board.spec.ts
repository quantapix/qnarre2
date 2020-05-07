import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {BoardComp} from './board';

describe('BoardComp', () => {
  let component: BoardComp;
  let fixture: ComponentFixture<BoardComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BoardComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BoardComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
