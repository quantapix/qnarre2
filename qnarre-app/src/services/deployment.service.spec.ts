import {ReflectiveInjector} from '@angular/core';
import {environment} from '../environments/environment';
import {LocationService} from './location.service';
import {MockLocationService} from '../testing/location.service';
import {Deployment} from './deployment.service';

describe('Deployment service', () => {
  describe('mode', () => {
    it('should get the mode from the environment', () => {
      environment.mode = 'foo';
      const d = getInjector().get(Deployment);
      expect(d.mode).toEqual('foo');
    });
    it('should get the mode from the `mode` query parameter if available', () => {
      const inj = getInjector();
      const l: MockLocationService = inj.get(LocationService);
      l.search.and.returnValue({mode: 'bar'});
      const d = inj.get(Deployment);
      expect(d.mode).toEqual('bar');
    });
  });
});

function getInjector() {
  return ReflectiveInjector.resolveAndCreate([
    Deployment,
    {provide: LocationService, useFactory: () => new MockLocationService('')}
  ]);
}
