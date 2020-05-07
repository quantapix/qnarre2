import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {slideInAnimation} from './animations';

import {Ndata, Ldata} from '../graph/model';
import {DataService} from '../graph/data.service';

@Component({
  selector: 'qnr-app',
  template: `<qnr-graph-app></qnr-graph-app>
    <!--
  <qnr-graph [nodes]="nodes" [links]="links"></qnr-graph>
  <h1 class="title">Angular Router</h1>
  <nav>
    <a routerLink="/crisis-center" routerLinkActive="active">Crisis Center</a>
    <a routerLink="/superheroes" routerLinkActive="active">Heroes</a>
    <a routerLink="/admin" routerLinkActive="active">Admin</a>
    <a routerLink="/login" routerLinkActive="active">Login</a>
    <a [routerLink]="[{outlets: {popup: ['compose']}}]">Contact</a>
  </nav>
  <div [@routeAnimation]="getAnimationData(routerOutlet)">
    <router-outlet #routerOutlet="outlet"></router-outlet>
  </div>
  <router-outlet name="popup"></router-outlet>
  ---> `,
  animations: [slideInAnimation]
})
export class AppComp {
  title = 'qnarre-app';
  nodes = [] as Ndata[];
  links = [] as Ldata[];

  constructor(private data: DataService) {
    const g = this.data.getGraphs()[2];
    g.nodes().forEach((n, i) => {
      const nd = new Ndata(n, i, g.node(n));
      this.nodes.push(nd);
      g.setNode(n, nd);
    });
    g.links().forEach((l, i) => {
      const n0 = g.node(l.nodes[0]) as Ndata;
      n0.size++;
      const n1 = g.node(l.nodes[1]) as Ndata;
      n1.size++;
      const ld = new Ldata(i, [n0, n1]);
      this.links.push(ld);
    });
  }

  getAnimationData(outlet: RouterOutlet) {
    return (
      outlet &&
      outlet.activatedRouteData &&
      outlet.activatedRouteData['animation']
    );
  }
}

@Component({
  selector: 'qnr-page-not-found',
  template: `<h2>Page not found</h2>`
})
export class PageNotFoundComp {}
