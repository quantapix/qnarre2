import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';

import {Injectable} from '@angular/core';
import {MessageService} from '../message.service';
import {Crisis} from './crisis';
import {CRISES} from './mock-crises';

@Injectable({
  providedIn: 'root'
})
export class CrisisService {
  static nextCrisisId = 100;
  private crises$: BehaviorSubject<Crisis[]> = new BehaviorSubject<Crisis[]>(
    CRISES
  );

  constructor(public service: MessageService) {}

  getCrises() {
    return this.crises$;
  }

  getCrisis(id: number | string) {
    return this.getCrises().pipe(map(cs => cs.find(c => c.id === +id)));
  }

  addCrisis(name: string) {
    name = name.trim();
    if (name) {
      const c = {id: CrisisService.nextCrisisId++, name};
      CRISES.push(c);
      this.crises$.next(CRISES);
    }
  }
}
