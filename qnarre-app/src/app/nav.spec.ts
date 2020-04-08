import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NO_ERRORS_SCHEMA} from '@angular/core';

import {NavMenuComp, NavItemComp} from './nav';
import {Item} from './nav.serv';

describe('NavMenuComp (class-only)', () => {
  it('should filter out hidden nodes', () => {
    const c = new NavMenuComp();
    const ms: Item[] = [{title: 'a'}, {title: 'b', hidden: true}, {title: 'c'}];
    c.items = ms;
    expect(c.unhidden).toEqual([ms[0], ms[2]]);
  });
});

describe('NavItemComp', () => {
  describe('(class-only)', () => {
    let c: NavItemComp;
    let selItems: Item[];
    let setClassesSpy: any;

    function init(i: Item) {
      c.item = i;
      onChanges();
    }
    function onChanges() {
      c.ngOnChanges();
    }
    beforeEach(() => {
      c = new NavItemComp();
      setClassesSpy = spyOn(c, 'setClasses').and.callThrough();
      selItems = [{title: 'a'}, {title: 'parent'}, {title: 'grandparent'}];
      c.selItems = selItems;
    });

    describe('should have expected classes when initd', () => {
      it('with selected node', () => {
        init(selItems[0]);
        expect(c.classes).toEqual({
          'level-1': true,
          collapsed: false,
          expanded: true,
          selected: true
        });
      });
      it('with selected node ancestor', () => {
        init(selItems[1]);
        expect(c.classes).toEqual({
          'level-1': true,
          collapsed: false,
          expanded: true,
          selected: true
        });
      });
      it('with other than a selected node or ancestor', () => {
        init({title: 'x'});
        expect(c.classes).toEqual({
          'level-1': true,
          collapsed: true,
          expanded: false,
          selected: false
        });
      });
    });

    describe('when becomes a non-selected node', () => {
      beforeEach(() => (c.item = {title: 'x'}));
      it('should de-select if previously selected', () => {
        c.selected = true;
        onChanges();
        expect(c.selected).toBe(false, 'becomes de-selected');
      });
      it('should collapse if previously expanded in narrow mode', () => {
        c.wide = false;
        c.expanded = true;
        onChanges();
        expect(c.expanded).toBe(false, 'becomes collapsed');
      });
      it('should remain expanded in wide mode', () => {
        c.wide = true;
        c.expanded = true;
        onChanges();
        expect(c.expanded).toBe(true, 'remains expanded');
      });
    });

    describe('when becomes a selected node', () => {
      beforeEach(() => (c.item = selItems[0]));
      it('should select when previously not selected', () => {
        c.selected = false;
        onChanges();
        expect(c.selected).toBe(true, 'becomes selected');
      });
      it('should expand the current node or keep it expanded', () => {
        c.expanded = false;
        onChanges();
        expect(c.expanded).toBe(true, 'becomes true');
        c.expanded = true;
        onChanges();
        expect(c.expanded).toBe(true, 'remains true');
      });
    });

    describe('when becomes a selected ancestor node', () => {
      beforeEach(() => (c.item = selItems[2]));
      it('should select when previously not selected', () => {
        c.selected = false;
        onChanges();
        expect(c.selected).toBe(true, 'becomes selected');
      });
      it('should always expand this header', () => {
        c.expanded = false;
        onChanges();
        expect(c.expanded).toBe(true, 'becomes expanded');
        c.expanded = false;
        onChanges();
        expect(c.expanded).toBe(true, 'stays expanded');
      });
    });

    describe('when headerClicked()', () => {
      it('should expand when headerClicked() and previously collapsed', () => {
        c.expanded = false;
        c.headerClicked();
        expect(c.expanded).toBe(true, 'should be expanded');
      });
      it('should collapse when headerClicked() and previously expanded', () => {
        c.expanded = true;
        c.headerClicked();
        expect(c.expanded).toBe(false, 'should be collapsed');
      });
      it('should not change isSelected when headerClicked()', () => {
        c.selected = true;
        c.headerClicked();
        expect(c.selected).toBe(true, 'remains selected');
        c.selected = false;
        c.headerClicked();
        expect(c.selected).toBe(false, 'remains not selected');
      });
      it('should set classes', () => {
        c.headerClicked();
        expect(setClassesSpy).toHaveBeenCalled();
      });
    });
  });

  describe('(via TestBed)', () => {
    let c: NavItemComp;
    let f: ComponentFixture<NavItemComp>;
    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [NavItemComp],
        schemas: [NO_ERRORS_SCHEMA]
      });
      f = TestBed.createComponent(NavItemComp);
      c = f.componentInstance;
      c.item = {
        title: 'x',
        children: [{title: 'a'}, {title: 'b', hidden: true}, {title: 'c'}]
      };
    });
    it('should not show the hidden child nav-item', () => {
      c.ngOnChanges();
      f.detectChanges();
      const cs = f.debugElement.queryAll(By.directive(NavItemComp));
      expect(cs.length).toEqual(2);
    });
    it('should pass the `wide` property to all displayed child nav-items', () => {
      c.wide = true;
      c.ngOnChanges();
      f.detectChanges();
      let cs = f.debugElement.queryAll(By.directive(NavItemComp));
      expect(cs.length).toEqual(2, 'when wide is true');
      cs.forEach(c => expect(c.componentInstance.wide).toBe(true));
      c.wide = false;
      c.ngOnChanges();
      f.detectChanges();
      cs = f.debugElement.queryAll(By.directive(NavItemComp));
      expect(cs.length).toEqual(2, 'when wide is false');
      cs.forEach(c => expect(c.componentInstance.wide).toBe(false));
    });
  });
});
