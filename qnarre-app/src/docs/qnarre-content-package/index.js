const Package = require('dgeni').Package;
const basePackage = require('../qnarre-base-package');
const contentPackage = require('../content-package');

const { CONTENTS_PATH } = require('../config');

module.exports = new Package('qnarre-content', [basePackage, contentPackage])

  .config(function(readFilesProcessor, collectExamples, renderExamples) {
    readFilesProcessor.sourceFiles = readFilesProcessor.sourceFiles.concat([
      {
        basePath: CONTENTS_PATH,
        include:
          CONTENTS_PATH +
          '/{analytics,app,parser,proxy,stimulus,story,technology}/**/*.{html,md}',
        fileReader: 'contentFileReader'
      },
      {
        basePath: CONTENTS_PATH + '/marketing',
        include: CONTENTS_PATH + '/marketing/**/*.{html,md}',
        fileReader: 'contentFileReader'
      },
      {
        basePath: CONTENTS_PATH,
        include: CONTENTS_PATH + '/*.md',
        exclude: [CONTENTS_PATH + '/index.md'],
        fileReader: 'contentFileReader'
      },
      {
        basePath: CONTENTS_PATH,
        include: CONTENTS_PATH + '/navigation.json',
        fileReader: 'jsonFileReader'
      },
      {
        basePath: CONTENTS_PATH,
        include: CONTENTS_PATH + '/marketing/announcements.json',
        fileReader: 'jsonFileReader'
      },
      {
        basePath: CONTENTS_PATH,
        include: CONTENTS_PATH + '/marketing/contributors.json',
        fileReader: 'jsonFileReader'
      },
      {
        basePath: CONTENTS_PATH,
        include: CONTENTS_PATH + '/marketing/resources.json',
        fileReader: 'jsonFileReader'
      }
    ]);

    renderExamples.ignoreBrokenExamples = true;
  })

  .config(function(inlineTagProcessor) {
    inlineTagProcessor.inlineTagDefinitions.push(
      require('./inline-tag-defs/anchor')
    );
  })

  .config(function(computePathsProcessor) {
    computePathsProcessor.pathTemplates = computePathsProcessor.pathTemplates.concat(
      [
        {
          docTypes: ['content'],
          getPath: doc => `${doc.id.replace(/\/index$/, '')}`,
          outputPathTemplate: '${path}.json'
        },
        {
          docTypes: ['navigation-json'],
          pathTemplate: '${id}',
          outputPathTemplate: '../${id}.json'
        },
        {
          docTypes: ['contributors-json'],
          pathTemplate: '${id}',
          outputPathTemplate: '../${id}.json'
        },
        {
          docTypes: ['announcements-json'],
          pathTemplate: '${id}',
          outputPathTemplate: '../${id}.json'
        },
        {
          docTypes: ['resources-json'],
          pathTemplate: '${id}',
          outputPathTemplate: '../${id}.json'
        }
      ]
    );
  })

  .config(function(convertToJsonProcessor, postProcessHtml) {
    convertToJsonProcessor.docTypes.push('content');
    postProcessHtml.docTypes.push('content');
  });
