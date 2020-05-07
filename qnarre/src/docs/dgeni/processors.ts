module.exports = function checkDocsHavePackage(createDocMessage) {
  return {
    $runAfter: ["readPackageInfo"],
    $runBefore: ["computing-ids"],
    docTypes: ["dgProcessor", "dgService"],
    $process: function(docs) {
      var docTypes = this.docTypes;
      docs.forEach(function(doc) {
        if (!doc.packageDoc && docTypes.indexOf(doc.docType) !== -1) {
          throw new Error(
            createDocMessage("Failed to find package for " + doc.codeName, doc)
          );
        }
      });
    }
  };
};

export function computeProcessorPipeline(): Processor {
  return {
    name: "",
    $runAfter: ["readPackageInfo"],
    $runBefore: ["rendering-docs"],
    $process(ds: Doc[]) {
      ds.forEach(d => {
        if (d.docType === "dgPackage") {
          const ps = collectProcs(d);
          d.pipeline = sortByDeps(ps, "$runAfter", "$runBefore");
        }
      });
    }
  };
}

function collectProcs(doc: Doc) {
  let ps = [].concat(doc.processors);
  doc.dependencies.forEach(d => {
    ps = ps.concat(collectProcs(d));
  });
  return ps;
}

module.exports = function filterJSFileDocs() {
  return {
    $runAfter: ["readPackageInfo"],
    $runBefore: ["rendering-docs"],
    $process: function(docs) {
      return docs.filter(function(doc) {
        return doc.docType !== "js";
      });
    }
  };
};

module.exports = function generateIndex() {
  return {
    $runAfter: ["adding-extra-docs"],
    $runBefore: ["extra-docs-added"],
    $process: function(docs) {
      var indexDoc = {
        docType: "indexPage",
        name: "index",
        packages: []
      };
      docs.forEach(function(doc) {
        if (doc.docType === "dgPackage") {
          indexDoc.packages.push(doc);
        }
      });
      docs.push(indexDoc);
    }
  };
};

var Package = require("dgeni").Package;

module.exports = function readPackageInfo() {
  return {
    $runAfter: ["tags-extracted"],
    $runBefore: ["computing-ids"],
    $process: function(docs) {
      docs.forEach(function(doc) {
        if (doc.docType === "dgPackage") {
          // Create an instance of the processor and extract the interesting properties
          doc.package = require(doc.fileInfo.filePath);
          doc.services = [];

          // Wire up the processor docs
          doc.processors = doc.package.processors.map(function(processorName) {
            processorName = processorName.name || processorName;

            // TODO - yes this is horribly slow :-)
            var processorDoc = docs.filter(function(doc) {
              if (doc.docType === "dgProcessor") {
                return (
                  processorName === doc.name || processorName === doc.codeName
                );
              }
            })[0];

            if (!processorDoc) {
              processorDoc = {
                docType: "dgProcessor"
              };
              docs.push(processorDoc);
            }

            // No doc for this processor so get it from the package
            var processor = doc.package.module[processorName][1];
            if (doc.package.module[processorName][0] === "factory") {
              // processor is defined as a factory so we call it to get the definition
              processor = processor();
            }

            processorDoc.$runBefore = processor.$runBefore;
            processorDoc.$runAfter = processor.$runAfter;
            processorDoc.$validate = processor.$validate;
            processorDoc.$process = processor.$process;
            processorDoc.name = processorName;
            processorDoc.packageDoc = doc;

            return processorDoc;
          });

          // Wire up package dependency docs
          doc.dependencies = doc.package.dependencies.map(function(dependency) {
            // TODO - yes this is horribly slow :-)
            var packageDoc = docs.filter(function(doc) {
              return dependency.name === doc.name || dependency === doc.name;
            })[0];

            if (!packageDoc) {
              // No doc for this dependency package so get it direcly from the package
              packageDoc =
                dependency instanceof Package
                  ? dependency
                  : { name: dependency };
            }

            return packageDoc;
          });
        }
      });
    }
  };
};

module.exports = function wireUpServicesToPackages() {
  return {
    $runAfter: ["readPackageInfo"],
    $runBefore: ["checkDocsHavePackage"],
    $process: function(docs) {
      // Build a map of the service name to package doc
      var services = {};
      docs.forEach(function(doc) {
        if (doc.docType === "dgPackage") {
          var packageDoc = doc;
          for (serviceName in doc.package.module) {
            services[serviceName] = doc;
          }
        }
      });

      docs.forEach(function(doc) {
        if (doc.docType === "dgService" || doc.docType === "dgProcessor") {
          doc.name = doc.name || doc.codeName;
          doc.packageDoc = services[doc.name];
          doc.packageDoc.services.push(doc);
        }
      });
    }
  };
};
