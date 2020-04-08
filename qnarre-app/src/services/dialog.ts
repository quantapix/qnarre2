import {Injectable} from '@angular/core';
import {of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  confirm(m?: string) {
    const c = window.confirm(m || 'Is it OK?');
    return of(c);
  }
}
