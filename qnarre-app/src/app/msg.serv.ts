import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MsgService {
  msgs: string[] = [];

  add(m: string) {
    this.msgs.push(m);
  }

  clear() {
    this.msgs = [];
  }
}
