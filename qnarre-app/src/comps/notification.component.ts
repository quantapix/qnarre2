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
import {DateToken, WindowToken} from '../app/tokens';

const LOCAL_STORAGE_NAMESPACE = 'qnr-notification/';

@Component({
  selector: 'qnr-notification',
  templateUrl: 'notification.component.html',
  animations: [
    trigger('hideAnimation', [
      state('show', style({height: '*'})),
      state('hide', style({height: 0})),
      transition('show => hide', animate(250))
    ])
  ]
})
export class NotificationComponent implements OnInit {
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
