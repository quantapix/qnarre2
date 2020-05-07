import {Injectable} from '@angular/core';
import {LocService} from './loc.serv';
import {environment} from '../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class DeployService {
  mode: string = this.loc.search()['mode'] || environment.mode;
  constructor(private loc: LocService) {}
}
