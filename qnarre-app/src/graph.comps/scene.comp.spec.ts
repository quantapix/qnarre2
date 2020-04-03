import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {SceneComp} from './scene.comp';

describe('SceneComp', () => {
  let component: SceneComp;
  let fixture: ComponentFixture<SceneComp>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SceneComp]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SceneComp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
