import {Package} from '..';
import {linkInlineTagDef} from './defs';
import {getAliases, getDocFromAlias, getLinkInfo} from './services';
import jsdoc from '../jsdoc';

export default new Package('links', [jsdoc])
  .addFactory(linkInlineTagDef)
  .addFactory(getAliases)
  .addFactory(getDocFromAlias)
  .addFactory(getLinkInfo)
  .addConfig((proc, def) => {
    proc.inlineTagDefinitions.push(def);
  });
