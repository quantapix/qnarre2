/* eslint-disable @typescript-eslint/unbound-method */
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Component, NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {DateToken, WindowToken} from '../app/tokens';
import {NotificationComp} from './notification';

describe('NotificationComp', () => {
  let c: NotificationComp;
  let f: ComponentFixture<TestComponent>;

  function configTestingModule(now = new Date('2018-01-20')) {
    TestBed.configureTestingModule({
      declarations: [TestComponent, NotificationComp],
      providers: [
        {provide: WindowToken, useClass: MockWindow},
        {provide: DateToken, useValue: now}
      ],
      imports: [NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA]
    });
  }

  function createComponent() {
    f = TestBed.createComponent(TestComponent);
    const debugElement = f.debugElement.query(By.directive(NotificationComp));
    c = debugElement.componentInstance;
    c.ngOnInit();
    f.detectChanges();
  }

  describe('content projection', () => {
    it('should display the message text', () => {
      configTestingModule();
      createComponent();
      expect(f.nativeElement.innerHTML).toContain(
        'Version 6 of Angular Now Available!'
      );
    });
    it('should render HTML elements', () => {
      configTestingModule();
      createComponent();
      const button = f.debugElement.query(By.css('.action-button'));
      expect(button.nativeElement.textContent).toEqual('Learn More');
    });
    it('should process Angular directives', () => {
      configTestingModule();
      createComponent();
      const badSpans = f.debugElement.queryAll(By.css('.bad'));
      expect(badSpans.length).toEqual(0);
    });
  });
  it('should call dismiss() when the message link is clicked, if dismissOnContentClick is true', () => {
    configTestingModule();
    createComponent();
    spyOn(c, 'dismiss');
    c.dismissOnContentClick = true;
    const message: HTMLSpanElement = f.debugElement.query(
      By.css('.messageholder')
    ).nativeElement;
    message.click();
    expect(c.dismiss).toHaveBeenCalled();
  });
  it('should not call dismiss() when the message link is clicked, if dismissOnContentClick is false', () => {
    configTestingModule();
    createComponent();
    spyOn(c, 'dismiss');
    c.dismissOnContentClick = false;
    const message: HTMLSpanElement = f.debugElement.query(
      By.css('.messageholder')
    ).nativeElement;
    message.click();
    expect(c.dismiss).not.toHaveBeenCalled();
  });
  it('should call dismiss() when the close button is clicked', () => {
    configTestingModule();
    createComponent();
    spyOn(c, 'dismiss');
    f.debugElement.query(By.css('button')).triggerEventHandler('click', null);
    f.detectChanges();
    expect(c.dismiss).toHaveBeenCalled();
  });
  it('should hide the notification when dismiss is called', () => {
    configTestingModule();
    createComponent();
    expect(c.showNotification).toBe('show');
    c.dismiss();
    expect(c.showNotification).toBe('hide');
  });
  it('should update localStorage key when dismiss is called', () => {
    configTestingModule();
    createComponent();
    const setItemSpy = (TestBed.inject(WindowToken) as MockWindow).localStorage
      .setItem;
    c.dismiss();
    expect(setItemSpy).toHaveBeenCalledWith(
      'qnr-notification/survey-january-2018',
      'hide'
    );
  });
  it('should not show the notification if the date is after the expiry date', () => {
    configTestingModule(new Date('2018-01-23'));
    createComponent();
    expect(c.showNotification).toBe('hide');
  });
  it('should not show the notification if the there is a "hide" flag in localStorage', () => {
    configTestingModule();
    const getItemSpy = (TestBed.inject(WindowToken) as MockWindow).localStorage
      .getItem;
    getItemSpy.and.returnValue('hide');
    createComponent();
    expect(getItemSpy).toHaveBeenCalledWith(
      'qnr-notification/survey-january-2018'
    );
    expect(c.showNotification).toBe('hide');
  });
});

@Component({
  template: `
    <qnr-notification
      notificationId="survey-january-2018"
      expirationDate="2018-01-22"
    >
      <span class="messageholder">
        <a
          href="https://blog.angular.io/version-6-0-0-of-angular-now-available-cc56b0efa7a4"
        >
          <span *ngIf="false" class="bad">This should not appear</span>
          <span class="message">Version 6 of Angular Now Available!</span>
          <span class="action-button">Learn More</span>
        </a>
      </span>
    </qnr-notification>
  `
})
class TestComponent {}

class MockWindow {
  localStorage = jasmine.createSpyObj('localStorage', ['getItem', 'setItem']);
}
