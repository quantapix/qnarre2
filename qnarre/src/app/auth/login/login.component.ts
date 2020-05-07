import {Component} from '@angular/core';
import {Router, NavigationExtras} from '@angular/router';
import {AuthService} from '../auth.service';

@Component({
  selector: 'qnr-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  message?: string;
  constructor(public authService: AuthService, public router: Router) {
    this.setMessage();
  }
  setMessage() {
    this.message = 'Logged ' + (this.authService.isLoggedIn ? 'in' : 'out');
  }
  login() {
    this.message = 'Trying to log in ...';
    this.authService.login().subscribe(() => {
      this.setMessage();
      if (this.authService.isLoggedIn) {
        const redirect = this.authService.redirectUrl
          ? this.router.parseUrl(this.authService.redirectUrl)
          : '/admin';
        let extras: NavigationExtras = {
          queryParamsHandling: 'preserve',
          preserveFragment: true
        };
        this.router.navigateByUrl(redirect, extras);
      }
    });
  }
  logout() {
    this.authService.logout();
    this.setMessage();
  }
}
