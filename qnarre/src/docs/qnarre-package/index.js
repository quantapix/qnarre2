const Package = require('dgeni').Package;
const gitPackage = require('dgeni-packages/git');
const contentPackage = require('../qnarre-content-package');
const cliPackage = require('../qnarre-cli-package');
const apiPackage = require('../qnarre-api-package');
const { extname, resolve } = require('canonical-path');
const { existsSync } = require('fs');
const { SRC_PATH } = require('../config');

module.exports = new Package('qnarre.com', [
  gitPackage,
  // apiPackage,
  contentPackage
  // cliPackage
])
  .processor(require('./processors/processNavigationMap'))
  .processor(require('./processors/createOverviewDump'))
  .processor(require('./processors/cleanGeneratedFiles'))

  .config(function(renderDocsProcessor, versionInfo) {
    renderDocsProcessor.extraData.versionInfo = versionInfo;
  })

  .config(function(
    checkAnchorLinksProcessor,
    linkInlineTagDef,
    renderExamples
  ) {
    linkInlineTagDef.failOnBadLink = true;
    checkAnchorLinksProcessor.$enabled = true;
    // since we encode the HTML to JSON we need to ensure that this
    // processor runs before that encoding happens.
    checkAnchorLinksProcessor.$runBefore = ['convertToJsonProcessor'];
    checkAnchorLinksProcessor.$runAfter = ['fixInternalDocumentLinks'];
    // We only want to check docs that are going to be output as JSON
    // docs.
    checkAnchorLinksProcessor.checkDoc = doc =>
      doc.path &&
      doc.outputPath &&
      extname(doc.outputPath) === '.json' &&
      doc.docType !== 'json-doc';
    // Since we have a `base[href="/"]` arrangement all links are relative
    // to that and not relative to the source document's path
    checkAnchorLinksProcessor.base = '/';
    // Ignore links to local assets
    // (This is not optimal in terms of performance without making changes
    // to dgeni-packages there is no other way.
    //  That being said do this only add 500ms onto the ~30sec doc-gen run
    //  - so not a huge issue)
    checkAnchorLinksProcessor.ignoredLinks.push({
      test(url) {
        return existsSync(resolve(SRC_PATH, url));
      }
    });
    checkAnchorLinksProcessor.pathVariants = [
      '',
      '/',
      '.html',
      '/index.html',
      '#top-of-page'
    ];
    checkAnchorLinksProcessor.errorOnUnmatchedLinks = false;

    // Make sure we fail if the examples are not right
    renderExamples.ignoreBrokenExamples = false;
  })

  .config(function(renderLinkInfo, postProcessHtml) {
    renderLinkInfo.docTypes = postProcessHtml.docTypes;
  });
