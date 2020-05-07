import path from 'path';
import {Package} from '..';

export default new Package('dgeni-docs', [require('../dgeni')])
  .addConfig((readFilesProcessor, writeFilesProcessor) => {
    readFilesProcessor.basePath = path.resolve(__dirname, '..');
    readFilesProcessor.sourceFiles = [
      {
        include: [
          '*/*.js',
          '*/processors/**.js',
          '*/services/**.js',
          '*/file-readers/**.js',
          '*/tag-defs/**.js',
          '*/rendering/**.js'
        ],
        exclude: ['docs', '**/*.spec.js', '**/*.template.js']
      }
    ];
    writeFilesProcessor.outputFolder = '.tmp/docs';
  })
  .addConfig(computePathsProcessor => {
    computePathsProcessor.pathTemplates.push({
      docTypes: ['dgPackage', 'indexPage'],
      pathTemplate: '${id}.md',
      outputPathTemplate: '${path}'
    });
    computePathsProcessor.pathTemplates.push({
      docTypes: ['dgProcessor'],
      pathTemplate: '${packageDoc.id}/processors/${name}.md',
      outputPathTemplate: '${path}'
    });
    computePathsProcessor.pathTemplates.push({
      docTypes: ['dgService'],
      pathTemplate: '${packageDoc.id}/services/${name}.md',
      outputPathTemplate: '${path}'
    });
  })
  .addConfig((templateFinder, templateEngine) => {
    templateFinder.templateFolders.unshift(
      path.resolve(__dirname, 'templates')
    );
    templateFinder.templatePatterns = [
      '${ doc.template }',
      '${ doc.id }.${ doc.docType }.template.md',
      '${ doc.id }.template.md',
      '${ doc.docType }.template.md'
    ].concat(templateEngine.templatePatterns);
    templateEngine.config.tags = {
      variableStart: '{$',
      variableEnd: '$}'
    };
  })
  .addConfig(getLinkInfo => {
    getLinkInfo.relativeLinks = true;
  })
  .addConfig(debugDumpProcessor => {
    debugDumpProcessor.$enabled = true;
  });
