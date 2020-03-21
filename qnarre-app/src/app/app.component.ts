import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {slideInAnimation} from './animations';

import {Ndata, Ldata} from '../graph/model';
import {DataService} from '../graph/data.service';

@Component({
  selector: 'qnr-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [slideInAnimation]
})
export class AppComponent {
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
