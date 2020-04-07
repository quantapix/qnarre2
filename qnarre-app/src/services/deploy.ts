import {Injectable} from '@angular/core';
import {LocService} from './loc';
import {environment} from '../environments/environment.prod';

@Injectable()
export class Deployment {
  mode: string = this.location.search()['mode'] || environment.mode;
  constructor(private location: LocService) {}
}
