import {NavMenuComponent} from './nav-menu.component';

import {NavNode} from '../services/nav';

describe('NavMenuComponent (class-only)', () => {
  it('should filter out hidden nodes', () => {
    const c = new NavMenuComponent();
    const ns: NavNode[] = [
      {title: 'a'},
      {title: 'b', hidden: true},
      {title: 'c'}
    ];
    c.nodes = ns;
    expect(c.filteredNodes).toEqual([ns[0], ns[2]]);
  });
});
