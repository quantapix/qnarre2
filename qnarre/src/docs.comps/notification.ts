import {animate, state, style, trigger, transition} from '@angular/animations';
import {
  Component,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  OnInit,
  Output
} from '@angular/core';
import {DateToken, WindowToken} from '../app/types';

const LOCAL_STORAGE_NAMESPACE = 'qnr-notification/';

@Component({
  selector: 'qnr-notification',
  template: `<span
      class="content"
      (click)="contentClick()"
      (keyup.enter)="contentClick()"
    >
      <ng-content></ng-content>
    </span>
    <button
      mat-icon-button
      class="close-button"
      aria-label="Close"
      (click)="dismiss()"
    >
      <mat-icon svgIcon="close" aria-label="Dismiss notification"></mat-icon>
    </button> `,
  animations: [
    trigger('hideAnimation', [
      state('show', style({height: '*'})),
      state('hide', style({height: 0})),
      transition('show => hide', animate(250))
    ])
  ]
})
export class NotificationComp implements OnInit {
  private get localStorage() {
    return this.window.localStorage;
  }

  @Input() dismissOnContentClick: boolean;
  @Input() notificationId: string;
  @Input() expirationDate: string;
  @Output() dismissed = new EventEmitter();

  @HostBinding('@hideAnimation') showNotification: 'show' | 'hide';

  constructor(
    @Inject(WindowToken) private window: Window,
    @Inject(DateToken) private date: Date
  ) {}

  ngOnInit() {
    const hidden =
      this.localStorage.getItem(
        LOCAL_STORAGE_NAMESPACE + this.notificationId
      ) === 'hide';
    const expired = this.date > new Date(this.expirationDate);
    this.showNotification = hidden || expired ? 'hide' : 'show';
  }

  contentClick() {
    if (this.dismissOnContentClick) {
      this.dismiss();
    }
  }

  dismiss() {
    this.localStorage.setItem(
      LOCAL_STORAGE_NAMESPACE + this.notificationId,
      'hide'
    );
    this.showNotification = 'hide';
    this.dismissed.next();
  }
}
