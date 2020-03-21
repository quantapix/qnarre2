import {switchMap} from 'rxjs/operators';
import {Component, OnInit} from '@angular/core';
import {Router, ActivatedRoute, ParamMap} from '@angular/router';
import {Observable} from 'rxjs';

import {HeroService} from '../hero.service';
import {Hero} from '../hero';

@Component({
  selector: 'qnr-hero-detail',
  templateUrl: './hero-detail.component.html',
  styleUrls: ['./hero-detail.component.scss']
})
export class HeroDetailComponent implements OnInit {
  hero$? = {} as Observable<Hero | undefined>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: HeroService
  ) {}

  ngOnInit() {
    this.hero$ = this.route.paramMap.pipe(
      switchMap((ps: ParamMap) => this.service.getHero(ps.get('id')!))
    );
  }

  gotoHeroes(hero: Hero) {
    const id = hero ? hero.id : null;
    this.router.navigate(['/superheroes', {id, foo: 'foo'}]);
  }
}
