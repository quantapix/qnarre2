import * as actions from './actions';
import {reducers} from './reducers';
import {createPluginInfo, createPluginsState} from '../plugins/plugins.spec';
import {LoadedCode} from './types';

function createPluginsListing() {
  return {
    core: createPluginInfo('Core'),
    scalars: createPluginInfo('Scalars')
  };
}

describe('core reducer', () => {
  describe('#changed', () => {
    it('sets active to the one in action payload', () => {
      const s = createPluginsState({active: 'foo', plugins: {}});
      const r = reducers(s, actions.changed({plugin: 'bar'}));
      expect(r.active).toBe('bar');
    });
    it('does not change plugins when active changes', () => {
      const s = createPluginsState({
        active: 'foo',
        plugins: createPluginsListing()
      });
      const r = reducers(s, actions.changed({plugin: 'bar'}));
      expect(r.plugins).toEqual(createPluginsListing());
    });
  });

  [
    {
      name: '#listingRequested',
      action: actions.listingRequested(),
      expected: LoadedCode.LOADING
    },
    {
      name: '#fetchFailed',
      action: actions.fetchFailed(),
      expected: LoadedCode.FAILED
    }
  ].forEach(({name, action, expected}) => {
    describe(name, () => {
      it('changes loaded state to Loading', () => {
        const s = createPluginsState({
          loaded: {}
        });
        const r = reducers(s, action);
        expect(r.loaded.state).toEqual(expected);
      });
      it('keeps timeLast the same', () => {
        const s = createPluginsState({
          loaded: {timeLast: 1337}
        });
        const r = reducers(s, action);
        expect(r.loaded.timeLast).toBe(1337);
      });
    });
  });

  describe('#listingFetched', () => {
    beforeEach(() => {
      jasmine.clock().mockDate(new Date(1000));
    });
    it('sets plugins with payload', () => {
      const s = createPluginsState({active: 'foo', plugins: {}});
      const r = reducers(
        s,
        actions.listingFetched({plugins: createPluginsListing()})
      );
      expect(r.plugins).toEqual(createPluginsListing());
    });
    it('sets loaded', () => {
      const s = createPluginsState({
        active: 'foo',
        plugins: {},
        loaded: {}
      });
      const r = reducers(
        s,
        actions.listingFetched({plugins: createPluginsListing()})
      );
      expect(r.loaded).toEqual({
        state: LoadedCode.LOADED,
        timeLast: 1000
      });
    });
    it('sets active to first plugin (by key order) when not defined', () => {
      const s = createPluginsState({active: null, plugins: {}});
      const r = reducers(
        s,
        actions.listingFetched({plugins: createPluginsListing()})
      );
      expect(r.active).toBe('core');
    });
    it('does not change active when already defined', () => {
      const s = createPluginsState({active: 'foo', plugins: {}});
      const r = reducers(
        s,
        actions.listingFetched({plugins: createPluginsListing()})
      );
      expect(r.active).toBe('foo');
    });
  });

  describe('#toggleEnabled', () => {
    it('toggles reloadEnabled', () => {
      const s1 = createPluginsState({reloadEnabled: false});
      const s2 = reducers(s1, actions.toggleEnabled());
      expect(s2.reloadEnabled).toBe(true);
      const s3 = reducers(s2, actions.toggleEnabled());
      expect(s3.reloadEnabled).toBe(false);
    });
  });

  describe('#changePeriod', () => {
    it('sets the reloadPeriod', () => {
      const s = createPluginsState({reloadPeriod: 1});
      const r = reducers(s, actions.changePeriod({period: 1000}));
      expect(r.reloadPeriod).toBe(1000);
    });
    it('ignores the action when period is non-positive', () => {
      const s0 = createPluginsState({reloadPeriod: 1});
      const s1 = reducers(s0, actions.changePeriod({period: 0}));
      expect(s1.reloadPeriod).toBe(1);
      const s2 = reducers(s0, actions.changePeriod({period: -1000}));
      expect(s2.reloadPeriod).toBe(1);
    });
  });
});
