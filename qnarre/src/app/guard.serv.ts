import {Injectable} from '@angular/core';
import {CanDeactivate} from '@angular/router';
import {Observable} from 'rxjs';

export interface Deactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GuardService implements CanDeactivate<Deactivate> {
  canDeactivate(d: Deactivate) {
    return d.canDeactivate ? d.canDeactivate() : true;
  }
}
