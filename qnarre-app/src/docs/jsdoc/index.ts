import path from 'path';
import {Doc, Package} from '..';

export default new Package('jsdoc', [require('../base')])
  .addProcessor({
    name: 'parsing-tags',
    $runAfter: ['files-read'],
    $runBefore: ['processing-docs']
  })
  .addProcessor({
    name: 'tags-parsed',
    $runAfter: ['parsing-tags'],
    $runBefore: ['processing-docs']
  })
  .addProcessor({
    name: 'extracting-tags',
    $runAfter: ['tags-parsed'],
    $runBefore: ['processing-docs']
  })
  .addProcessor({
    name: 'tags-extracted',
    $runAfter: ['extracting-tags'],
    $runBefore: ['processing-docs']
  })

  .addProcessor(require('./processors/extractJSDocComments'))
  .addProcessor(require('./processors/code-name'))
  .addProcessor(require('./processors/parse-tags'))
  .addProcessor(require('./processors/extract-tags'))
  .addProcessor(require('./processors/inline-tags'))

  .addFactory(require('./services/code-name-map'))
  .addFactory(require('./services/code-name'))
  .addFactory(require('./services/transforms/extract-access'))
  .addFactory(require('./services/transforms/extract-name'))
  .addFactory(require('./services/transforms/extract-type'))
  .addFactory(require('./services/transforms/unknown-tag'))
  .addFactory(require('./services/transforms/whole-tag'))
  .addFactory(require('./services/transforms/trim-whitespace'))
  .addFactory(require('./services/parser-adapters/backtick-parser-adapter'))
  .addFactory(require('./services/parser-adapters/html-block-parser-adapter'))

  .addFactory(require('./services/jsParser'))
  .addFactory(require('./file-readers/jsdoc'))

  .addConfig((proc, reader) => {
    proc.fileReaders = [reader].concat(proc.fileReaders || []);
  })
  .addConfig((proc, inj) => {
    proc.tagDefinitions = inj(require('./tag-defs'));
  })
  .addConfig((proc, xform) => {
    proc.defaultTagTransforms = [xform];
  })
  .addConfig(proc => {
    proc.idTemplates.push({
      docTypes: ['js'],
      getId(doc: Doc) {
        let p = doc.name || doc.codeName;
        if (!p) {
          p = path.dirname(doc.fileInfo.relativePath);
          if (doc.fileInfo.baseName !== 'index') {
            p = path.join(p, doc.fileInfo.baseName);
          }
        }
        return p;
      },
      getAliases(doc: Doc) {
        return [doc.id];
      }
    });
  })
  .addConfig(proc => {
    proc.pathTemplates.push({
      docTypes: ['js'],
      pathTemplate: '${id}',
      outputPathTemplate: '${path}.html'
    });
  })
  .addConfig((svc, inj) => {
    svc.matchers = inj(require('./services/code-name-matchers'));
  });
