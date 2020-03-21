const visit = require('unist-util-visit');
const is = require('hast-util-is-element');
const source = require('unist-util-source');

module.exports = function addImageDimensions(getImageDimensions) {
  return function addImageDimensionsImpl() {
    return (ast, file) => {
      visit(ast, node => {
        if (is(node, 'img')) {
          const props = node.properties;
          const src = props.src;
          if (!src) {
            file.message(
              'Missing src in image tag `' + source(node, file) + '`'
            );
          } else {
            try {
              const dimensions = getImageDimensions(
                addImageDimensionsImpl.basePath,
                src
              );
              if (props.width === undefined && props.height === undefined) {
                props.width = '' + dimensions.width;
                props.height = '' + dimensions.height;
              }
            } catch (e) {
              if (e.code === 'ENOENT') {
                file.fail(
                  'Unable to load src in image tag `' + source(node, file) + '`'
                );
              } else {
                file.fail(e.message);
              }
            }
          }
        }
      });
    };
  };
};
