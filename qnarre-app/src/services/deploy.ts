import {Injectable} from '@angular/core';
import {LocService} from './loc';
import {environment} from '../environments/environment.prod';

@Injectable()
export class Deploy {
  mode: string = this.loc.search()['mode'] || environment.mode;
  constructor(private loc: LocService) {}
}
