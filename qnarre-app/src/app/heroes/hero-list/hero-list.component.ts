import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {HeroService} from '../hero.service';
import {Hero} from '../hero';

@Component({
  selector: 'qnr-hero-list',
  templateUrl: './hero-list.component.html',
  styleUrls: ['./hero-list.component.scss']
})
export class HeroListComponent implements OnInit {
  heroes$?: Observable<Hero[]>;
  selectedId?: number;
  constructor(private service: HeroService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.heroes$ = this.route.paramMap.pipe(
      switchMap(ps => {
        this.selectedId = +ps.get('id')!;
        return this.service.getHeroes();
      })
    );
  }
}
