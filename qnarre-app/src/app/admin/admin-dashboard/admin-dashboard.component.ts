import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {PreloadService} from '../../preloading-strategy.service';

@Component({
  selector: 'qnr-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  sessionId = {} as Observable<string>;
  token = {} as Observable<string>;
  modules: string[];

  constructor(private route: ActivatedRoute, preload: PreloadService) {
    this.modules = preload.modules;
  }

  ngOnInit() {
    this.sessionId = this.route.queryParamMap.pipe(
      map(ps => ps.get('session_id') || 'None')
    );
    this.token = this.route.fragment.pipe(map(f => f || 'None'));
  }
}
