import { Package } from "../package";
import path from "path";

module.exports = new Package("dgeni", [
  require("../jsdoc"),
  require("../nunjucks"),
  require("../links")
])
  .addProcessor(require("./processors/readPackageInfo"))
  .addProcessor(require("./processors/filterJSFileDocs"))
  .addProcessor(require("./processors/checkDocsHavePackage"))
  .addProcessor(require("./processors/wireUpServicesToPackages"))
  .addProcessor(require("./processors/generateIndex"))
  .addProcessor(require("./processors/computeProcessorPipeline"))
  .addConfig((parseTagsProcessor, getInjectables) => {
    parseTagsProcessor.tagDefinitions = parseTagsProcessor.tagDefinitions.concat(
      getInjectables([
        require("./tag-defs/dgPackage"),
        require("./tag-defs/dgService"),
        require("./tag-defs/dgProcessor")
      ])
    );
  })
  .addConfig(computeIdsProcessor => {
    computeIdsProcessor.idTemplates.push({
      docTypes: ["dgPackage", "indexPage"],
      idTemplate: "${name}",
      getAliases: doc => {
        return [doc.id];
      }
    });
    computeIdsProcessor.idTemplates.push({
      docTypes: ["dgProcessor", "dgService"],
      idTemplate: "${packageDoc.id}.${name}",
      getAliases: doc => {
        return [doc.name, doc.id];
      }
    });
  });
// TODO: When using this package you will need to provide
// * path templates to the computePathsProcessor for indexPage, dgPackage, dgProcessor and dgService
// * rendered content templates to the templateFinder
