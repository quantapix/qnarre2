import * as d3 from 'd3';

import * as qb from '../../graph/group/backend';
import {standard} from './palettes';

// Example usage:
// runs = ["train", "test", "test1", "test2"]
// ccs = new ColorScale();
// ccs.domain(runs);
// ccs.getColor("train");
// ccs.getColor("test1");

export class ColorScale {
  private identifiers = d3.map();

  constructor(private readonly palette: string[] = standard) {}

  public setDomain(strings: string[]): this {
    this.identifiers = d3.map();
    strings.forEach((s, i) => {
      this.identifiers.set(s, this.palette[i % this.palette.length]);
    });
    return this;
  }

  public getColor(s: string): string {
    if (!this.identifiers.has(s)) {
      throw new Error(`String ${s} was not in the domain.`);
    }
    return this.identifiers.get(s) as string;
  }
}

function create(
  store: qb.BaseStore,
  getDomain: () => string[]
): (runName: string) => string {
  const s = new ColorScale();
  function updateRunsColorScale(): void {
    s.setDomain(getDomain());
  }
  store.addListener(updateRunsColorScale);
  updateRunsColorScale();
  return domain => s.getColor(domain);
}

export const runsColorScale = create(qb.runsStore, () =>
  qb.runsStore.getRuns()
);

export const experimentsColorScale = create(qb.experimentsStore, () => {
  return qb.experimentsStore.getExperiments().map(({name}) => name);
});
