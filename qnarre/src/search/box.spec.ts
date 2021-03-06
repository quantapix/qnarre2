import {Component} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  inject,
  TestBed,
  tick
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {BoxComp} from './box';
import {LocService, MockLoc} from '../app/loc.serv';

@Component({
  template:
    '<qnr-search-box (onSearch)="searchHandler($event)" (onFocus)="focusHandler($event)"></qnr-search-box>'
})
class HostComponent {
  sSpy = jasmine.createSpy('searchHandler');
  fSpy = jasmine.createSpy('focusHandler');
}

describe('BoxComp', () => {
  let box: BoxComp;
  let host: HostComponent;
  let c: ComponentFixture<HostComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BoxComp, HostComponent],
      providers: [
        {
          provide: LocService,
          useFactory: () => new MockLoc('')
        }
      ]
    });
  });
  beforeEach(() => {
    c = TestBed.createComponent(HostComponent);
    host = c.componentInstance;
    box = c.debugElement.query(By.directive(BoxComp)).componentInstance;
    c.detectChanges();
  });
  describe('initialisation', () => {
    it('should get the current search query from the location service', fakeAsync(
      inject([LocService], (location: MockLoc) => {
        location.search.and.returnValue({search: 'initial search'});
        box.ngAfterViewInit();
        expect(location.search).toHaveBeenCalled();
        tick(300);
        expect(host.sSpy).toHaveBeenCalledWith('initial search');
        expect(box.searchBox.nativeElement.value).toEqual('initial search');
      })
    ));
    it('should decode the search query from the location service (chrome search provider format)', fakeAsync(
      inject([LocService], (location: MockLoc) => {
        location.search.and.returnValue({search: 'initial+search'});
        box.ngAfterViewInit();
        expect(location.search).toHaveBeenCalled();
        tick(300);
        expect(host.sSpy).toHaveBeenCalledWith('initial search');
        expect(box.searchBox.nativeElement.value).toEqual('initial search');
      })
    ));
  });

  describe('onSearch', () => {
    it('should debounce by 300ms', fakeAsync(() => {
      box.doSearch();
      expect(host.sSpy).not.toHaveBeenCalled();
      tick(300);
      expect(host.sSpy).toHaveBeenCalled();
    }));
    it('should pass through the value of the input box', fakeAsync(() => {
      const i = c.debugElement.query(By.css('input'));
      i.nativeElement.value = 'some query (input)';
      box.doSearch();
      tick(300);
      expect(host.sSpy).toHaveBeenCalledWith('some query (input)');
    }));
    it('should only send events if the search value has changed', fakeAsync(() => {
      const i = c.debugElement.query(By.css('input'));
      i.nativeElement.value = 'some query';
      box.doSearch();
      tick(300);
      expect(host.sSpy).toHaveBeenCalledTimes(1);
      box.doSearch();
      tick(300);
      expect(host.sSpy).toHaveBeenCalledTimes(1);
      i.nativeElement.value = 'some other query';
      box.doSearch();
      tick(300);
      expect(host.sSpy).toHaveBeenCalledTimes(2);
    }));
  });
  describe('on input', () => {
    it('should trigger a search', () => {
      const i = c.debugElement.query(By.css('input'));
      spyOn(box, 'doSearch');
      i.triggerEventHandler('input', {});
      expect(box.doSearch).toHaveBeenCalled();
    });
  });
  describe('on keyup', () => {
    it('should trigger a search', () => {
      const i = c.debugElement.query(By.css('input'));
      spyOn(box, 'doSearch');
      i.triggerEventHandler('keyup', {});
      expect(box.doSearch).toHaveBeenCalled();
    });
  });
  describe('on focus', () => {
    it('should trigger the onFocus event', () => {
      const i = c.debugElement.query(By.css('input'));
      i.nativeElement.value = 'some query (focus)';
      i.triggerEventHandler('focus', {});
      expect(host.focusHandler).toHaveBeenCalledWith('some query (focus)');
    });
  });
  describe('on click', () => {
    it('should trigger a search', () => {
      const i = c.debugElement.query(By.css('input'));
      spyOn(box, 'doSearch');
      i.triggerEventHandler('click', {});
      expect(box.doSearch).toHaveBeenCalled();
    });
  });
  describe('focus', () => {
    it('should set the focus to the input box', () => {
      const i = c.debugElement.query(By.css('input'));
      box.focus();
      expect(document.activeElement).toBe(i.nativeElement);
    });
  });
});
