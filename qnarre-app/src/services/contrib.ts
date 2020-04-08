import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {ConnectableObservable, Observable} from 'rxjs';
import {map, publishLast} from 'rxjs/operators';

import {CONTENT_URL_PREFIX} from './docs';

const contributorsPath = CONTENT_URL_PREFIX + 'contributors.json';
const knownGroups = ['Angular', 'Collaborators', 'GDE'];

export interface ContribGroup {
  name: string;
  order: number;
  contributors: Contrib[];
}

export interface Contrib {
  groups: string[];
  name: string;
  picture?: string;
  website?: string;
  twitter?: string;
  bio?: string;
  isFlipped?: boolean;
}

@Injectable()
export class ContribService {
  contributors: Observable<ContribGroup[]>;

  constructor(private http: HttpClient) {
    this.contributors = this.getContribs();
  }

  private getContribs() {
    const contributors = this.http
      .get<{[key: string]: Contrib}>(contributorsPath)
      .pipe(
        map(contribs => {
          const contribMap: {[name: string]: Contrib[]} = {};
          Object.keys(contribs).forEach(key => {
            const contributor = contribs[key];
            contributor.groups.forEach(group => {
              const contribGroup =
                contribMap[group] || (contribMap[group] = []);
              contribGroup.push(contributor);
            });
          });

          return contribMap;
        }),
        map(cmap => {
          return Object.keys(cmap)
            .map(key => {
              const order = knownGroups.indexOf(key);
              return {
                name: key,
                order: order === -1 ? knownGroups.length : order,
                contributors: cmap[key].sort(compareContribs)
              } as ContribGroup;
            })
            .sort(compareGroups);
        }),
        publishLast()
      );

    (contributors as ConnectableObservable<ContribGroup[]>).connect();
    return contributors;
  }
}

function compareContribs(l: Contrib, r: Contrib) {
  return l.name.toUpperCase() > r.name.toUpperCase() ? 1 : -1;
}

function compareGroups(l: ContribGroup, r: ContribGroup) {
  return l.order === r.order
    ? l.name > r.name
      ? 1
      : -1
    : l.order > r.order
    ? 1
    : -1;
}
