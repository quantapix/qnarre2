import {ReflectiveInjector} from '@angular/core';
import {environment} from '../environments/environment';
import {LocService, MockLoc} from './loc';
import {Deploy} from './deploy';

describe('Deploy service', () => {
  describe('mode', () => {
    it('should get the mode from the environment', () => {
      environment.mode = 'foo';
      const d = getInjector().get(Deploy);
      expect(d.mode).toEqual('foo');
    });
    it('should get the mode from the `mode` query parameter if available', () => {
      const inj = getInjector();
      const ls = inj.get(LocService) as MockLoc;
      ls.search.and.returnValue({mode: 'bar'});
      const d = inj.get(Deploy);
      expect(d.mode).toEqual('bar');
    });
  });
});

function getInjector() {
  return ReflectiveInjector.resolveAndCreate([
    Deploy,
    {provide: LocService, useFactory: () => new MockLoc('')}
  ]);
}
