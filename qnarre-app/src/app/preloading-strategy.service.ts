import {Injectable} from '@angular/core';
import {PreloadingStrategy, Route} from '@angular/router';
import {Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PreloadService implements PreloadingStrategy {
  modules = [] as string[];

  preload(r: Route, load: () => Observable<any>): Observable<any> {
    if (r.data && r.data['preload']) {
      this.modules.push(r.path!);
      console.log('Preloaded: ' + r.path);
      return load();
    } else {
      return of(null);
    }
  }
}
