import {ReflectiveInjector} from '@angular/core';
import {environment} from '../environments/environment';
import {LocService, MockLoc} from './loc.serv';
import {DeployService} from './deploy.serv';

describe('DeployService', () => {
  describe('mode', () => {
    it('should get the mode from the environment', () => {
      environment.mode = 'foo';
      const d = getInjector().get(DeployService);
      expect(d.mode).toEqual('foo');
    });
    it('should get the mode from the `mode` query parameter if available', () => {
      const inj = getInjector();
      const ls = inj.get(LocService) as MockLoc;
      ls.search.and.returnValue({mode: 'bar'});
      const d = inj.get(DeployService);
      expect(d.mode).toEqual('bar');
    });
  });
});

function getInjector() {
  return ReflectiveInjector.resolveAndCreate([
    DeployService,
    {provide: LocService, useFactory: () => new MockLoc('')}
  ]);
}
