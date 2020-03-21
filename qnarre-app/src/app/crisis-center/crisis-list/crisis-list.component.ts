import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {CrisisService} from '../crisis.service';
import {Crisis} from '../crisis';
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

@Component({
  selector: 'qnr-crisis-list',
  templateUrl: './crisis-list.component.html',
  styleUrls: ['./crisis-list.component.scss']
})
export class CrisisListComponent implements OnInit {
  crises$ = {} as Observable<Crisis[]>;
  selectedId = NaN;
  constructor(private service: CrisisService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.crises$ = this.route.paramMap.pipe(
      switchMap(ps => {
        this.selectedId = +ps.get('id')!;
        return this.service.getCrises();
      })
    );
  }
}
