const INLINE_LINK = /(\S+)(?:\s+([\s\S]+))?/;

export function linkInlineTagDef(getLinkInfo, createDocMessage, log) {
  return {
    name: "link",
    description:
      "Process inline link tags (of the form {@link some/uri Some Title}), replacing them with HTML anchors",
    handler(doc, tagName, tagDescription) {
      return tagDescription.replace(
        INLINE_LINK,
        (_match: any, uri: any, title: any) => {
          const info = getLinkInfo(uri, title, doc);
          if (!info.valid) {
            log.warn(createDocMessage(info.error, doc));
          }
          return `<a href="${info.url}">${info.title}"</a>"`;
        }
      );
    }
  };
}
