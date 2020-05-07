module.exports = () => {
  return {
    name: "area",
    defaultFn: doc => {
      return doc.fileInfo.extension === "js"
        ? "api"
        : doc.fileInfo.relativePath.split("/")[0];
    }
  };
};

module.exports = () => {
  return {
    name: "element",
    defaultFn: doc => {
      if (doc.docType === "directive" || doc.docType === "input") {
        return "ANY";
      }
    }
  };
};

module.exports = () => {
  return {
    name: "eventType",
    transforms: (doc, tag, value) => {
      const EVENTTYPE_REGEX = /^([^\s]*)\s+on\s+([\S\s]*)/;
      const match = EVENTTYPE_REGEX.exec(value);
      // Attach the target to the doc
      doc.eventTarget = match[2];
      // And return the type
      return match[1];
    }
  };
};

module.exports = () => {
  return {
    name: "example",
    multi: true,
    docProperty: "examples"
  };
};

module.exports = () => {
  return { name: "fullName" };
};

module.exports = () => {
  return { name: "id" };
};

module.exports = () => {
  return {
    name: "knownIssue",
    multi: true,
    docProperty: "knownIssues"
  };
};

module.exports = () => {
  return {
    name: "module",
    defaultFn(doc) {
      if (doc.area === "api" && doc.docType !== "overview") {
        return path.dirname(doc.fileInfo.relativePath).split("/")[0];
      }
    }
  };
};

module.exports = () => {
  return {
    name: "multiElement",
    transforms(doc, tag) {
      return true;
    }
  };
};

module.exports = createDocMessage => {
  return {
    name: "name",
    required: true,
    transforms(doc, tag, value) {
      const INPUT_TYPE = /input\[(.+)\]/;
      if (doc.docType === "input") {
        const match = INPUT_TYPE.exec(value);
        if (!match) {
          throw new Error(
            createDocMessage(
              'Invalid input directive name.  It should be of the form: "input[inputType]" but was "' +
                value +
                '"',
              doc
            )
          );
        }
        doc.inputType = match[1];
      }
      return value;
    }
  };
};

module.exports = () => {
  return {
    name: "ngdoc",
    required: true,
    docProperty: "docType"
  };
};

module.exports = () => {
  return { name: "packageName" };
};

module.exports = () => {
  return { name: "parent" };
};

module.exports = () => {
  return {
    name: "priority",
    defaultFn(doc) {
      return 0;
    }
  };
};

module.exports = () => {
  return {
    name: "restrict",
    defaultFn(doc) {
      if (doc.docType === "directive" || doc.docType === "input") {
        return {
          element: true,
          attribute: true,
          cssClass: false,
          comment: false
        };
      }
    },
    transforms(doc, tag, value) {
      value = value || "";
      return {
        element: value.indexOf("E") !== -1,
        attribute: value.indexOf("A") !== -1,
        cssClass: value.indexOf("C") !== -1,
        comment: value.indexOf("M") !== -1
      };
    }
  };
};

module.exports = () => {
  return {
    name: "scope",
    transforms(doc, tag) {
      return true;
    }
  };
};

module.exports = () => {
  return { name: "title" };
};

module.exports = [
  require("./ngdoc"),
  require("./name"),
  require("./area"),
  require("./module"),
  require("./id"),
  require("./restrict"),
  require("./eventType"),
  require("./example"),
  require("./element"),
  require("./fullName"),
  require("./priority"),
  require("./title"),
  require("./parent"),
  require("./packageName"),
  require("./scope"),
  require("./multiElement"),
  require("./knownIssue")
];
