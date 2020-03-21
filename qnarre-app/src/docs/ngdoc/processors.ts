export function collectKnownIssuesProcessor() {
  return {
    $runAfter: ["moduleDocsProcessor"],
    $runBefore: ["computing-paths"],
    $process(docs) {
      docs
        .filter(doc => {
          return doc.knownIssues && doc.knownIssues.length;
        })
        .forEach(doc => {
          const moduleDoc = doc.moduleDoc;
          moduleDoc.knownIssueDocs = moduleDoc.knownIssueDocs || [];
          moduleDoc.knownIssueDocs.push(doc);
        });
    }
  };
}

export function filterNgDocsProcessor(log) {
  return {
    $runAfter: ["tags-parsed"],
    $runBefore: ["extracting-tags"],
    $process(docs) {
      const docCount = docs.length;
      docs = _.filter(docs, doc => {
        return doc.tags.getTag("ngdoc");
      });
      log.debug("filtered " + (docCount - docs.length) + " docs");
      return docs;
    }
  };
}

export function generateComponentGroupsProcessor(moduleMap) {
  return {
    $runAfter: ["moduleDocsProcessor"],
    $runBefore: ["computing-paths"],
    $process(docs) {
      moduleMap.forEach(module => {
        _(module.components)
          .groupBy("docType")
          .tap(docTypes => {
            delete docTypes.overview;
          })
          .map((docs, docType) => {
            return {
              id: module.id + "." + docType,
              docType: "componentGroup",
              groupType: docType,
              moduleName: module.name,
              moduleDoc: module,
              area: module.area,
              name: docType + " components in " + module.name,
              components: docs
            };
          })
          .tap(groups => {
            module.componentGroups = groups;
            _.forEach(groups, group => {
              docs.push(group);
            });
          })
          .value();
      });
    }
  };
}

export function memberDocsProcessor(log, getDocFromAlias, createDocMessage) {
  const mergeableTypes = {
    method: "methods",
    property: "properties",
    event: "events"
  };

  return {
    $runAfter: ["ids-computed"],
    $runBefore: ["computing-paths"],
    $process(docs) {
      let parts;
      docs = _.filter(docs, doc => {
        if (doc.id.indexOf("#") !== -1) {
          doc.isMember = true;
          parts = doc.id.split("#");
          doc.memberof = parts[0];
          doc.name = parts[1].replace(/^.*:/, "");
          log.debug("child doc found", doc.id, doc.memberof);
          let containerDocs = getDocFromAlias(doc.memberof, doc);
          if (containerDocs.length === 0) {
            log.warn(
              createDocMessage(
                'Missing container document: "' + doc.memberof + '"',
                doc
              )
            );
            return;
          }
          if (containerDocs.length > 1) {
            containerDocs = getDocFromAlias(
              _.template("${module}.${memberof}")(doc),
              doc
            );
            if (containerDocs.length !== 1) {
              log.warn(
                createDocMessage(
                  "Ambiguous container document reference: " + doc.memberof,
                  doc
                )
              );
              return;
            }
          }
          const containerDoc = containerDocs[0];
          doc.memberof = containerDoc.id;
          const containerProperty = mergeableTypes[doc.docType];
          const container = (containerDoc[containerProperty] =
            containerDoc[containerProperty] || []);
          container.push(doc);
        } else {
          return doc;
        }
      });
      return docs;
    }
  };
}

module.exports = function moduleDocsProcessor(
  log,
  aliasMap,
  moduleMap,
  createDocMessage
) {
  return {
    $runAfter: ["ids-computed", "memberDocsProcessor"],
    $runBefore: ["computing-paths"],
    $process(docs) {
      let parts;
      _.forEach(docs, doc => {
        if (doc.docType === "module") {
          moduleMap.set(doc.id, doc);
          doc.components = [];
          const match = /^ng(.*)/.exec(doc.name);
          if (match) {
            if (!doc.packageName) {
              let packageName = match[1].toLowerCase();
              if (packageName) {
                packageName = "-" + packageName;
              }
              doc.packageName = "angular" + packageName;
            }
            doc.packageFile = doc.packageName + ".js";
          }
        }
      });
      _.forEach(docs, doc => {
        if (doc.docType !== "module" && doc.module) {
          let matchingModules = aliasMap.getDocs(doc.module);
          if (matchingModules.length > 1) {
            matchingModules = aliasMap.getDocs("module:" + doc.module);
          }
          if (matchingModules.length === 1) {
            const module = matchingModules[0];
            if (module.docType === "module") {
              module.components.push(doc);
            } else {
              throw new Error(
                createDocMessage(
                  '"' +
                    module.name +
                    '" is not a module. It is documented as "' +
                    module.docType +
                    '". Either the module is incorrectly typed or the module reference is invalid',
                  doc
                )
              );
            }
            doc.moduleDoc = module;
          } else if (matchingModules.length > 1) {
            let error = createDocMessage(
              'Ambiguous module reference: "' + doc.module + '"',
              doc
            );
            error += "\nMatching modules:\n";
            _.forEach(matchingModules, mod => {
              error += "- " + mod.id + "\n";
            });
            throw new Error(error);
          }
        }
      });
    }
  };
};

export function providerDocsProcessor(log, aliasMap, createDocMessage) {
  return {
    $runAfter: ["ids-computed", "memberDocsProcessor"],
    $runBefore: ["computing-paths"],
    $process(docs) {
      _.forEach(docs, doc => {
        if (doc.docType === "provider") {
          const serviceId = doc.id
            .replace(/provider:/, "service:")
            .replace(/Provider$/, "");
          const serviceDocs = aliasMap.getDocs(serviceId);
          if (serviceDocs.length === 1) {
            serviceDoc = serviceDocs[0];
            doc.serviceDoc = serviceDoc;
            serviceDoc.providerDoc = doc;
          } else if (serviceDocs.length === 0) {
            log.warn(
              createDocMessage(
                'Missing service "' + serviceId + '" for provider',
                doc
              )
            );
          } else {
            log.warn(
              createDocMessage(
                'Ambiguous service name "' + serviceId + '" for provider',
                doc
              ) +
                "\n" +
                _.reduce(
                  serviceDocs,
                  (msg, doc) => {
                    return msg + '\n  "' + doc.id + '"';
                  },
                  "Matching docs: "
                )
            );
          }
        }
      });
    }
  };
}
