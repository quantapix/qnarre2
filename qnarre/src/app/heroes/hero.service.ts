import {Injectable} from '@angular/core';

import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

import {Hero} from './hero';
import {HEROES} from './mock-heroes';
import {MsgService} from '../msg.serv';

@Injectable({
  providedIn: 'root'
})
export class HeroService {
  constructor(private messageService: MsgService) {}
  getHeroes(): Observable<Hero[]> {
    this.messageService.add('HeroService: fetched heroes');
    return of(HEROES);
  }
  getHero(id: number | string) {
    return this.getHeroes().pipe(
      // (+) before `id` turns the string into a number
      map((heroes: Hero[]) => heroes.find(hero => hero.id === +id))
    );
  }
}
