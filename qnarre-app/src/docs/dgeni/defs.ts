export function dgPackage() {
  return {
    name: "dgPackage",
    docProperty: "name",
    transforms: (doc, tag, value) => {
      doc.docType = "dgPackage";
      return value;
    }
  };
}

export function dgProcessor() {
  return {
    name: "dgProcessor",
    docProperty: "name",
    transforms: (doc, tag, value) => {
      doc.docType = "dgProcessor";
      return value;
    }
  };
}

export function dgService() {
  return {
    name: "dgService",
    docProperty: "name",
    transforms: (doc, tag, value) => {
      doc.docType = "dgService";
      return value;
    }
  };
}
