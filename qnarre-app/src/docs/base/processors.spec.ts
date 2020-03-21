import path from 'path';
import {expect} from 'chai';
import spy from 'chai-spies';
import {Dgeni} from '..';
import {mockPackage} from './packages';

function tidyUp(promise, done) {
  return promise.then(
    () => {
      done();
    },
    err => {
      console.log('ERROR', err.stack);
      done(err);
    }
  );
}

function createReadFilesProcessor(fileReaders, sourceFiles, basePath) {
  const dgeni = new Dgeni([mockPackage()]);
  const injector = dgeni.configure();
  const processor = injector.get('readFilesProcessor');
  processor.fileReaders = fileReaders;
  processor.sourceFiles = sourceFiles;
  processor.basePath = path.resolve(__dirname, basePath);
  return processor;
}

describe('read-files doc processor', () => {
  it('should complain if a file reader is not valid', () => {
    expect(() => {
      const processor = createReadFilesProcessor(
        [{}],
        ['docs/*'],
        '../fixtures'
      );
      processor.$process();
    }).to.throw(new Error('Invalid File Reader: It must have a name property'));
    expect(() => {
      const processor = createReadFilesProcessor(
        [{name: 'badFileReader'}],
        ['docs/*'],
        '../fixtures'
      );
      processor.$process();
    }).to.throw(
      new Error(
        'Invalid File Reader: "badFileReader": It must have a getDocs property'
      )
    );
  });

  it('should iterate over matching files, providing fileInfo to the reader', done => {
    const mockFileReader = {
      name: 'mockFileReader',
      getDocs(fileInfo) {
        return [{fileInfo2: fileInfo}];
      }
    };
    processor = createReadFilesProcessor(
      [mockFileReader],
      ['docs/*'],
      '../fixtures'
    );
    const promise = processor.$process().then(docs => {
      expect(docs.length).to.equal(2);
      expect(docs[0].fileInfo).to.equal({
        fileReader: 'mockFileReader',
        filePath: path.resolve(processor.basePath, 'docs/a.js'),
        baseName: 'a',
        extension: 'js',
        basePath: processor.basePath,
        relativePath: 'docs/a.js',
        projectRelativePath: 'docs/a.js',
        content: '// Mock code file'
      });
      expect(docs[0].fileInfo2).to.be(docs[0].fileInfo);
      expect(docs[1].fileInfo).to.equal({
        fileReader: 'mockFileReader',
        filePath: path.resolve(processor.basePath, 'docs/b.ngdoc'),
        baseName: 'b',
        extension: 'ngdoc',
        basePath: processor.basePath,
        relativePath: 'docs/b.ngdoc',
        projectRelativePath: 'docs/b.ngdoc',
        content: 'mock documentation file'
      });
      expect(docs[1].fileInfo2).to.be(docs[1].fileInfo);
    });
    tidyUp(promise, done);
  });

  it('should accept an array of include patterns', done => {
    const mockFileReader = {
      name: 'mockFileReader',
      getDocs(fileInfo) {
        return [{fileInfo2: fileInfo}];
      }
    };
    processor = createReadFilesProcessor(
      [mockFileReader],
      [{include: ['docs/*']}],
      '../fixtures'
    );
    const promise = processor.$process().then(docs => {
      expect(docs.length).to.equal(2);
      expect(docs[0].fileInfo).to.equal({
        fileReader: 'mockFileReader',
        filePath: path.resolve(processor.basePath, 'docs/a.js'),
        baseName: 'a',
        extension: 'js',
        basePath: processor.basePath,
        relativePath: 'docs/a.js',
        projectRelativePath: 'docs/a.js',
        content: '// Mock code file'
      });
      expect(docs[0].fileInfo2).to.be(docs[0].fileInfo);
      expect(docs[1].fileInfo).to.equal({
        fileReader: 'mockFileReader',
        filePath: path.resolve(processor.basePath, 'docs/b.ngdoc'),
        baseName: 'b',
        extension: 'ngdoc',
        basePath: processor.basePath,
        relativePath: 'docs/b.ngdoc',
        projectRelativePath: 'docs/b.ngdoc',
        content: 'mock documentation file'
      });
      expect(docs[1].fileInfo2).to.be(docs[1].fileInfo);
    });
    tidyUp(promise, done);
  });

  it('should complain if there is no matching file-reader', done => {
    const mockFileReader = {
      name: 'mockFileReader',
      defaultPattern: /\.js$/,
      getDocs(fileInfo) {
        return [{fileInfo2: fileInfo}];
      }
    };
    processor = createReadFilesProcessor(
      [mockFileReader],
      ['docs/*'],
      '../fixtures'
    );
    processor.$process().then(
      docs => {
        console.log('expected createReadFileProcessor to fail');
        expect(docs).to.be(undefined);
      },
      err => {
        expect(err).to.match(/No file reader found for .+b\\.ngdoc/);
        done();
      }
    );
  });

  it('should complain if the sourceFiles property is not valid', () => {
    expect(() => {
      const mockFileReader = {
        name: 'mockFileReader',
        defaultPattern: /\.js$/,
        getDocs(fileInfo) {
          return [{fileInfo2: fileInfo}];
        }
      };
      const processor = createReadFilesProcessor(
        [mockFileReader],
        [{wrong: 'docs/*'}],
        '../fixtures'
      );
      processor.$process();
    }).to.throw(
      new Error(
        'Invalid sourceFiles parameter. ' +
          'You must pass an array of items, each of which is either a string or an object of the form ' +
          '{ include: "...", basePath: "...", exclude: "...", fileReader: "..." }'
      )
    );
  });

  describe('fileReaders', () => {
    const mockNgDocFileReader = {
      name: 'mockNgDocFileReader',
      defaultPattern: /\.ngdoc$/,
      getDocs(fileInfo) {
        return [{}];
      }
    };

    const mockJsFileReader = {
      name: 'mockJsFileReader',
      defaultPattern: /\.js$/,
      getDocs(fileInfo) {
        return [{}];
      }
    };

    it('should use the first file reader that matches if none is specified for a sourceInfo', done => {
      processor = createReadFilesProcessor(
        [mockNgDocFileReader, mockJsFileReader],
        ['docs/*'],
        '../fixtures'
      );
      const promise = processor.$process().then(docs => {
        expect(docs[0].fileInfo.extension).to.equal('js');
        expect(docs[0].fileInfo.fileReader).to.equal('mockJsFileReader');
        expect(docs[1].fileInfo.extension).to.equal('ngdoc');
        expect(docs[1].fileInfo.fileReader).to.equal('mockNgDocFileReader');
      });
      tidyUp(promise, done);
    });

    it('should use the fileReader named in the sourceInfo, rather than try to match one', done => {
      processor = createReadFilesProcessor(
        [mockNgDocFileReader, mockJsFileReader],
        [{include: 'docs/*', fileReader: 'mockJsFileReader'}],
        '../fixtures'
      );
      const promise = processor.$process().then(docs => {
        expect(docs[0].fileInfo.extension).to.equal('js');
        expect(docs[0].fileInfo.fileReader).to.equal('mockJsFileReader');
        expect(docs[1].fileInfo.extension).to.equal('ngdoc');
        expect(docs[1].fileInfo.fileReader).to.equal('mockJsFileReader');
      });
      tidyUp(promise, done);
    });
  });

  describe('exclusions', () => {
    it('should exclude files that match the exclude property of a sourceInfo', done => {
      const mockFileReader = {
        name: 'mockFileReader',
        getDocs(fileInfo) {
          return [{}];
        }
      };
      processor = createReadFilesProcessor(
        [mockFileReader],
        [{include: 'docs/*', exclude: '**/*.ngdoc'}],
        '../fixtures'
      );
      const promise = processor.$process().then(docs => {
        expect(docs.length).to.equal(1);
        expect(docs[0].fileInfo.extension).to.equal('js');
      });
      tidyUp(promise, done);
    });

    it('should accept an array of exclusion patterns', done => {
      const mockFileReader = {
        name: 'mockFileReader',
        getDocs(fileInfo) {
          return [{}];
        }
      };
      processor = createReadFilesProcessor(
        [mockFileReader],
        [{include: 'docs/*', exclude: ['**/*.ngdoc']}],
        '../fixtures'
      );
      const promise = processor.$process().then(docs => {
        expect(docs.length).to.equal(1);
        expect(docs[0].fileInfo.extension).to.equal('js');
      });
      tidyUp(promise, done);
    });
  });

  describe('relative paths', () => {
    it('should set the relativePath on the doc.fileInfo property correctly', done => {
      const mockFileReader = {
        name: 'mockFileReader',
        getDocs(fileInfo) {
          return [{}];
        }
      };
      processor = createReadFilesProcessor(
        [mockFileReader],
        [{include: 'src/**/*', basePath: 'src'}],
        '../fixtures'
      );
      const promise = processor.$process().then(docs => {
        expect(docs.length).to.equal(2);
        expect(docs[0].fileInfo.relativePath).to.equal('f1/a.js');
        expect(docs[1].fileInfo.relativePath).to.equal('f2/b.js');
      });
      tidyUp(promise, done);
    });
  });
});

describe('writeFilesProcessor', () => {
  let processor, writeFileSpy, mockLog;

  beforeEach(() => {
    writeFileSpy = jasmine
      .createSpy('writeFile')
      .and.returnValue(Promise.resolve());

    const testPackage = mockPackage().factory('writeFile', () => {
      return writeFileSpy;
    });

    const dgeni = new Dgeni([testPackage]);
    const injector = dgeni.configure();
    const readFilesProcessor = injector.get('readFilesProcessor');
    readFilesProcessor.basePath = path.resolve('some/path');
    processor = injector.get('writeFilesProcessor');
    processor.outputFolder = 'build';
    mockLog = injector.get('log');
  });

  it('should write each document to a file', () => {
    processor.$process([
      {renderedContent: 'SOME RENDERED CONTENT', outputPath: 'doc/path.html'}
    ]);
    expect(writeFileSpy).to.have.been.called.with(
      path.resolve('some/path/build/doc/path.html'),
      'SOME RENDERED CONTENT'
    );
  });

  it('should log a debug message if a doc has no outputPath', () => {
    processor.$process([
      {renderedContent: 'SOME RENDERED CONTENT', id: 'doc1', docType: 'test'}
    ]);
    expect(mockLog.debug).to.have.been.called.with(
      'Document "doc1, test" has no outputPath.'
    );
  });
});

describe('computeIdsProcessor', () => {
  let processor, mockLog;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configure();
    processor = injector.get('computeIdsProcessor');
    mockLog = injector.get('log');
  });

  it('should do nothing but log a debug message if there is no id template for the given docType', () => {
    processor.idTemplates = [
      {
        docTypes: ['a'],
        getId: jasmine.createSpy('getId').and.returnValue('index'),
        getAliases: jasmine.createSpy('getAliases').and.returnValue(['a', 'b']),
        idTemplate: `${docType}`
      }
    ];
    const doc = {docType: 'b'};
    processor.$process([doc]);
    expect(processor.idTemplates[0].getId).not.to.have.been.called();
    expect(processor.idTemplates[0].getAliases).not.to.have.been.called();
    expect(doc).to.equal({docType: 'b'});
    expect(mockLog.debug).to.have.been.called();
  });

  it('should compute id and partial ids using the getId and getAliases functions', () => {
    processor.idTemplates = [
      {
        docTypes: ['a'],
        getId: jasmine.createSpy('getId').and.returnValue('index'),
        getAliases: jasmine.createSpy('getAliases').and.returnValue(['a', 'b']),
        idTemplate: `${docType}`
      }
    ];
    const doc = {docType: 'a'};
    processor.$process([doc]);
    expect(processor.idTemplates[0].getId).to.have.been.called();
    expect(processor.idTemplates[0].getAliases).to.have.been.called();
    expect(doc).to.equal({docType: 'a', id: 'index', aliases: ['a', 'b']});
  });

  it('should compute the id using the template strings if no getId/getAliases functions are specified', () => {
    processor.idTemplates = [
      {
        docTypes: ['a'],
        idTemplate: `${docType}`
      }
    ];
    const doc = {docType: 'a'};
    processor.$process([doc]);
    expect(doc).to.equal({docType: 'a', id: 'a'});
  });

  it('should use the template that matches the given docType', () => {
    processor.idTemplates = [
      {
        docTypes: ['a'],
        idTemplate: 'A'
      },
      {
        docTypes: ['b'],
        idTemplate: 'B'
      }
    ];
    const docA = {docType: 'a'};
    const docB = {docType: 'b'};
    processor.$process([docA, docB]);
    expect(docA).to.equal({docType: 'a', id: 'A'});
    expect(docB).to.equal({docType: 'b', id: 'B'});
  });

  it('should use the id if present (and not compute a new one)', () => {
    processor.idTemplates = [
      {
        docTypes: ['a'],
        getId: jasmine.createSpy('getId').and.returnValue('index'),
        getAliases: jasmine.createSpy('getAliases').and.returnValue(['a', 'b']),
        idTemplate: `${docType}`
      }
    ];
    const doc = {docType: 'a', id: 'already/here', aliases: ['x', 'y', 'z']};
    processor.$process([doc]);
    expect(processor.idTemplates[0].getId).not.to.have.been.called();
    expect(processor.idTemplates[0].getAliases).not.to.have.been.called();
    expect(doc).to.equal({
      docType: 'a',
      id: 'already/here',
      aliases: ['x', 'y', 'z']
    });
  });
});

describe('computePathsProcessor', () => {
  let processor, mockLog;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configure();
    processor = injector.get('computePathsProcessor');
    mockLog = injector.get('log');
  });

  it('should do nothing but log a debug message if there is no path template for the given docType', () => {
    processor.pathTemplates = [
      {
        docTypes: ['a'],
        getPath: jasmine.createSpy('getPath').and.returnValue('index'),
        getOutputPath: jasmine
          .createSpy('getOutputPath')
          .and.returnValue('index.html'),
        pathTemplate: `${docType}`,
        outputPathTemplate: `${docType}.html`
      }
    ];
    const doc = {docType: 'b'};
    processor.$process([doc]);
    expect(processor.pathTemplates[0].getPath).not.to.have.been.called();
    expect(processor.pathTemplates[0].getOutputPath).not.to.have.been.called();
    expect(doc).to.equal({docType: 'b'});
    expect(mockLog.debug).to.have.been.called();
  });

  it('should compute path and outputPath using the getPath and getOutputPath functions', () => {
    processor.pathTemplates = [
      {
        docTypes: ['a'],
        getPath: jasmine.createSpy('getPath').and.returnValue('index'),
        getOutputPath: jasmine
          .createSpy('getOutputPath')
          .and.returnValue('index.html'),
        pathTemplate: `${docType}`,
        outputPathTemplate: `${docType}.html`
      }
    ];
    const doc = {docType: 'a'};
    processor.$process([doc]);
    expect(processor.pathTemplates[0].getPath).to.have.been.called();
    expect(processor.pathTemplates[0].getOutputPath).to.have.been.called();
    expect(doc).to.equal({
      docType: 'a',
      path: 'index',
      outputPath: 'index.html'
    });
  });

  it('should compute the path using the template strings if no getPath/getOutputPath functions are specified', () => {
    processor.pathTemplates = [
      {
        docTypes: ['a'],
        pathTemplate: `${docType}`,
        outputPathTemplate: `${docType}.html`
      }
    ];
    const doc = {docType: 'a'};
    processor.$process([doc]);
    expect(doc).to.equal({docType: 'a', path: 'a', outputPath: 'a.html'});
  });

  it('should use the template that matches the given docType', () => {
    processor.pathTemplates = [
      {
        docTypes: ['a'],
        pathTemplate: 'A',
        outputPathTemplate: 'A.html'
      },
      {
        docTypes: ['b'],
        pathTemplate: 'B',
        outputPathTemplate: 'B.html'
      }
    ];
    const docA = {docType: 'a'};
    const docB = {docType: 'b'};
    processor.$process([docA, docB]);
    expect(docA).to.equal({docType: 'a', path: 'A', outputPath: 'A.html'});
    expect(docB).to.equal({docType: 'b', path: 'B', outputPath: 'B.html'});
  });

  it('should use the path if present (and not compute a new one)', () => {
    processor.pathTemplates = [
      {
        docTypes: ['a'],
        getPath: jasmine.createSpy('getPath').and.returnValue('index'),
        getOutputPath: jasmine
          .createSpy('getOutputPath')
          .and.returnValue('index.html'),
        pathTemplate: `${docType}`,
        outputPathTemplate: `${docType}.html`
      }
    ];
    const doc = {
      docType: 'a',
      path: 'already/here',
      outputPath: 'already/here/file.html'
    };
    processor.$process([doc]);
    expect(processor.pathTemplates[0].getPath).not.to.have.been.called();
    expect(processor.pathTemplates[0].getOutputPath).not.to.have.been.called();
    expect(doc).to.equal({
      docType: 'a',
      path: 'already/here',
      outputPath: 'already/here/file.html'
    });
  });
});

describe('unescapeCommentsProcessor', () => {
  it('should convert HTML encoded comments back to their original form', () => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configure();
    const processor = injector.get('unescapeCommentsProcessor');
    const doc = {
      renderedContent:
        'Some text containing /&amp;#42; a comment &amp;#42;/\nSome text containing /&amp;#42; a comment &amp;#42;/'
    };
    processor.$process([doc]);
    expect(doc.renderedContent).to.equal(
      'Some text containing /* a comment */\nSome text containing /* a comment */'
    );
  });
});

describe('checkAnchorLinks', () => {
  let processor, mockLog;

  function checkWarning(link, doc) {
    expect(mockLog.warn).to.have.been.called();
    expect(mockLog.warn.calls.first().args[0]).to.contain(doc);
    expect(mockLog.warn.calls.first().args[0]).to.contain(link);
  }

  beforeEach(() => {
    const testPackage = mockPackage();
    const dgeni = new Dgeni([testPackage]);
    const injector = dgeni.configure();
    processor = injector.get('checkAnchorLinksProcessor');
    mockLog = injector.get('log');
  });

  it('should warn when there is a dangling link', () => {
    processor.$process([
      {
        renderedContent: '<a href="foo"></a>',
        outputPath: 'doc/path.html',
        path: 'doc/path'
      }
    ]);
    checkWarning('foo', 'doc/path.html');
  });

  it('should abort when there is a dangling link and `errorOnUnmatchedLinks` is true', () => {
    processor.errorOnUnmatchedLinks = true;
    expect(() => {
      processor.$process([
        {
          renderedContent: '<a href="foo"></a>',
          outputPath: 'doc/path.html',
          path: 'doc/path'
        }
      ]);
    }).to.throw(new Error('1 unmatched links'));
  });

  it('should not warn when there is a page for a link', () => {
    processor.$process([
      {
        renderedContent: '<a href="/foo"></a>',
        outputPath: 'doc/path.html',
        path: 'doc/path'
      },
      {renderedContent: 'CONTENT OF FOO', outputPath: 'foo.html', path: 'foo'}
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should match links who are prone to uri encoding', () => {
    processor.$process([
      {
        renderedContent: '<a href="Foo extends Bar"></a>',
        outputPath: 'doc/path.html',
        path: 'doc/path'
      },
      {
        renderedContent: 'CONTENT OF FOO',
        outputPath: 'doc/Foo extends Bar.html',
        path: 'doc/Foo extends Bar'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should not warn if the link matches a path after it has been modified with a path variant', () => {
    processor.$process([
      {
        renderedContent: '<a href="/foo"></a>',
        outputPath: 'doc/path.html',
        path: 'doc/path'
      },
      {
        renderedContent: 'CONTENT OF FOO',
        outputPath: 'foo.html',
        path: 'foo/'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should skip files that do not pass the `checkDoc` method', () => {
    processor.$process([
      {renderedContent: '<a href="/foo"></a>', outputPath: 'x.js', path: 'x'},
      {renderedContent: '<a href="/foo"></a>', outputPath: 'x.html'}
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should skip links that match the `ignoredLinks` property', () => {
    processor.$process([
      {renderedContent: '<a>foo</a>', outputPath: 'x.html', path: 'x'},
      {
        renderedContent: '<a href="http://www.google.com">foo</a>',
        outputPath: 'a.html',
        path: 'a'
      },
      {
        renderedContent: '<a href="mailto:foo@foo.com">foo</a>',
        outputPath: 'c.html',
        path: 'c'
      },
      {
        renderedContent: '<a href="chrome://accessibility">Accessibility</a>',
        outputPath: 'c.html',
        path: 'c'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should not warn for links to named anchors', () => {
    processor.$process([
      {
        renderedContent: '<a name="foo">foo</a><a href="#foo">to foo</a>',
        outputPath: 'x.html',
        path: 'x'
      },
      {
        renderedContent: '<a href="x#foo">foo</a>',
        outputPath: 'a.html',
        path: 'a'
      },
      {
        renderedContent: '<a href="x.html#foo">foo</a>',
        outputPath: 'b.html',
        path: 'b'
      },
      {
        renderedContent: '<a href="x#">foo</a>',
        outputPath: 'c.html',
        path: 'c'
      },
      {
        renderedContent: '<a href="x.html#">foo</a>',
        outputPath: 'd.html',
        path: 'd'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should not warn for links to elements defined by id', () => {
    processor.$process([
      {
        renderedContent: '<div id="foo">foo</div><a href="#foo">to foo</a>',
        outputPath: 'x.html',
        path: 'x'
      },
      {
        renderedContent: '<a href="x#foo">foo</a>',
        outputPath: 'a.html',
        path: 'a'
      },
      {
        renderedContent: '<a href="x.html#foo">foo</a>',
        outputPath: 'b.html',
        path: 'b'
      },
      {
        renderedContent: '<a href="x#">foo</a>',
        outputPath: 'c.html',
        path: 'c'
      },
      {
        renderedContent: '<a href="x.html#">foo</a>',
        outputPath: 'd.html',
        path: 'd'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should cope with non-latin characters in the fragment that get url encoded', () => {
    processor.$process([
      {
        renderedContent:
          '<div id="모듈">모듈</div><a href="#%EB%AA%A8%EB%93%88">to 모듈</a>',
        outputPath: 'a.html',
        path: 'a'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });

  it('should warn for internal, same page, dangling links', () => {
    processor.$process([
      {
        renderedContent: '<a href="#foo">to foo</a>',
        outputPath: 'x.html',
        path: 'x'
      }
    ]);
    checkWarning('#foo', 'x.html');
  });

  it('should warn for internal, cross page, dangling links', () => {
    processor.$process([
      {
        renderedContent: '<a name="foo">foo</a>',
        outputPath: 'x.html',
        path: 'x'
      },
      {
        renderedContent: '<a href="x#bar">to bar</a>',
        outputPath: 'y.html',
        path: 'y'
      }
    ]);
    checkWarning('x#bar', 'y.html');
  });

  it('should skip non-anchor elements', () => {
    processor.$process([
      {
        renderedContent: '<div href="foo"></div>',
        outputPath: 'c.html',
        path: 'c'
      }
    ]);
    expect(mockLog.warn).not.to.have.been.called();
  });
});

let processor, renderSpy, findTemplateSpy;

describe('render-docs', () => {
  beforeEach(() => {
    const testPackage = mockPackage().factory('templateFinder', () => {
      const finderSpy = jasmine
        .createSpy('findTemplate')
        .and.returnValue('SOME TEMPLATE');
      return {
        getFinder: () => {
          return finderSpy;
        }
      };
    });
    const dgeni = new Dgeni([testPackage]);
    const injector = dgeni.configure();
    findTemplateSpy = injector.get('templateFinder').getFinder();
    renderSpy = injector.get('templateEngine').getRenderer();
    processor = injector.get('renderDocsProcessor');
  });

  it('should call the templateFinder for each doc', () => {
    const doc1 = {},
      doc2 = {},
      docs = [doc1, doc2];
    processor.$process(docs);
    expect(findTemplateSpy.calls.count()).to.equal(2);
    expect(findTemplateSpy.calls.argsFor(0)).to.equal([doc1]);
    expect(findTemplateSpy.calls.argsFor(1)).to.equal([doc2]);
  });

  it('should call the templateEngine.render with the template and data', () => {
    const doc1 = {id: 1},
      doc2 = {id: 2},
      docs = [doc1, doc2];
    const someProp = {},
      someMethod = () => {
        /* */
      };
    processor.extraData.someProp = someProp;
    processor.helpers.someMethod = someMethod;
    processor.$process(docs);
    expect(renderSpy.calls.count()).to.equal(2);
    expect(renderSpy.calls.argsFor(0)).to.equal([
      'SOME TEMPLATE',
      {doc: doc1, docs, someProp, someMethod}
    ]);
    expect(renderSpy.calls.argsFor(1)).to.equal([
      'SOME TEMPLATE',
      {doc: doc2, docs, someProp, someMethod}
    ]);
  });

  it('should place the result of calling templateEngine.render into doc.renderedContent', () => {
    const doc1 = {id: 1},
      doc2 = {id: 2},
      docs = [doc1, doc2];
    renderSpy.and.returnValue('RENDERED CONTENT');
    processor.$process(docs);
    expect(doc1.renderedContent).to.equal('RENDERED CONTENT');
    expect(doc2.renderedContent).to.equal('RENDERED CONTENT');
  });
});

describe('debugDumpProcessor', () => {
  it('should write out the docs to a file', () => {
    const writeFileSpy = jasmine
      .createSpy('writeFile')
      .and.returnValue(Promise.resolve());
    const testPackage = mockPackage().factory('writeFile', () => {
      return writeFileSpy;
    });
    const dgeni = new Dgeni([testPackage]);
    const injector = dgeni.configure();
    const readFilesProcessor = injector.get('readFilesProcessor');
    readFilesProcessor.basePath = path.resolve('some/path');
    const processor = injector.get('debugDumpProcessor');
    processor.outputPath = 'build/dump.txt';
    processor.$process([{val: 'a'}, {val: 'b'}]);
    expect(writeFileSpy).to.have.been.called.with(
      path.resolve('some/path/build/dump.txt'),
      "[ { val: 'a' }, { val: 'b' } ]"
    );
  });
});
