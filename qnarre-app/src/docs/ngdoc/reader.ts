export function ngdocFileReader() {
  return {
    name: "ngdocFileReader",
    defaultPattern: /\.ngdoc$/,
    getDocs(fileInfo) {
      return [
        {
          content: fileInfo.content,
          startingLine: 1
        }
      ];
    }
  };
}
