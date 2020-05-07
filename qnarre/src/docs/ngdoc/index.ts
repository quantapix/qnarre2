import path from 'path';
import {Package} from '..';

export default new Package('ngdoc', [
  require('../jsdoc'),
  require('../nunjucks'),
  require('../links')
])
  .addFactory(require('./file-readers/ngdoc'))
  .addFactory(require('./services/getTypeClass'))
  .addFactory(require('./services/moduleMap'))
  .addProcessor(require('./processors/filterNgdocs'))
  .addProcessor(require('./processors/generateComponentGroups'))
  .addProcessor(require('./processors/memberDocs'))
  .addProcessor(require('./processors/moduleDocs'))
  .addProcessor(require('./processors/providerDocs'))
  .addProcessor(require('./processors/collectKnownIssues'))
  .addConfig((readFilesProcessor, ngdocFileReader) => {
    readFilesProcessor.fileReaders.push(ngdocFileReader);
  })
  .addConfig((parseTagsProcessor, getInjectables) => {
    parseTagsProcessor.tagDefinitions = parseTagsProcessor.tagDefinitions.concat(
      getInjectables(require('./tag-defs'))
    );
  })
  .addConfig((templateFinder, templateEngine, getInjectables) => {
    templateFinder.templateFolders.unshift(
      path.resolve(__dirname, 'templates')
    );
    templateEngine.config.tags = {
      variableStart: '{$',
      variableEnd: '$}'
    };
    templateFinder.templatePatterns = [
      '${ doc.template }',
      '${doc.area}/${ doc.id }.${ doc.docType }.template.html',
      '${doc.area}/${ doc.id }.template.html',
      '${doc.area}/${ doc.docType }.template.html',
      '${ doc.id }.${ doc.docType }.template.html',
      '${ doc.id }.template.html',
      '${ doc.docType }.template.html'
    ].concat(templateEngine.templatePatterns);
    templateEngine.filters = templateEngine.filters.concat(
      getInjectables([
        require('./rendering/filters/code'),
        require('./rendering/filters/link'),
        require('./rendering/filters/type-class')
      ])
    );
    templateEngine.tags = templateEngine.tags.concat(
      getInjectables([require('./rendering/tags/code')])
    );
  })
  .addConfig((computeIdsProcessor, createDocMessage, getAliases) => {
    computeIdsProcessor.idTemplates.push({
      docTypes: ['module'],
      idTemplate: 'module:${name}',
      getAliases
    });
    computeIdsProcessor.idTemplates.push({
      docTypes: ['method', 'property', 'event'],
      getId(doc) {
        const parts = doc.name.split('#');
        const name = parts.pop();
        parts.push(doc.docType + ':' + name);
        return parts.join('#');
      },
      getAliases
    });
    computeIdsProcessor.idTemplates.push({
      docTypes: [
        'provider',
        'service',
        'directive',
        'input',
        'object',
        'function',
        'filter',
        'type'
      ],
      idTemplate: 'module:${module}.${docType}:${name}',
      getAliases
    });
  })
  .addConfig((computePathsProcessor, createDocMessage) => {
    computePathsProcessor.pathTemplates.push({
      docTypes: [
        'provider',
        'service',
        'directive',
        'input',
        'object',
        'function',
        'filter',
        'type'
      ],
      pathTemplate: '${area}/${module}/${docType}/${name}',
      outputPathTemplate: 'partials/${area}/${module}/${docType}/${name}.html'
    });
    computePathsProcessor.pathTemplates.push({
      docTypes: ['module'],
      pathTemplate: '${area}/${name}',
      outputPathTemplate: 'partials/${area}/${name}/index.html'
    });
    computePathsProcessor.pathTemplates.push({
      docTypes: ['componentGroup'],
      pathTemplate: '${area}/${moduleName}/${groupType}',
      outputPathTemplate:
        'partials/${area}/${moduleName}/${groupType}/index.html'
    });
  });
