module.exports = function contentFileReader() {
  return {
    name: 'contentFileReader',
    defaultPattern: /\.md$/,
    getDocs: function(fileInfo) {
      return [{ docType: 'content', content: fileInfo.content }];
    }
  };
};
