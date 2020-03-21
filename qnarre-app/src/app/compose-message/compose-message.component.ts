import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'qnr-compose-message',
  templateUrl: './compose-message.component.html',
  styleUrls: ['./compose-message.component.scss']
})
export class ComposeMessageComponent {
  details = '';
  message = '';
  sending = false;
  constructor(private router: Router) {}
  send() {
    this.sending = true;
    this.details = 'Sending Message...';
    setTimeout(() => {
      this.sending = false;
      this.closePopup();
    }, 1000);
  }
  cancel() {
    this.closePopup();
  }
  closePopup() {
    this.router.navigate([{outlets: {popup: null}}]);
  }
}
