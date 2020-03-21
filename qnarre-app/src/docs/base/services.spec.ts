import {Dgeni} from '..';
import {mockPackage} from './packages';

describe('aliasMap', () => {
  let aliasMap;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    aliasMap = inj.get('aliasMap');
  });

  describe('addDoc', () => {
    it('should add the doc to an array for each alias', () => {
      const d = {aliases: ['a', 'b', 'c']};
      aliasMap.addDoc(d);
      expect(aliasMap.getDocs('a')).toEqual([d]);
      expect(aliasMap.getDocs('b')).toEqual([d]);
      expect(aliasMap.getDocs('c')).toEqual([d]);
    });

    it('should not add the doc if it has no aliases', () => {
      const d = {};
      aliasMap.addDoc(d);
      expect(aliasMap.getDocs('a')).toEqual([]);
      expect(aliasMap.getDocs('b')).toEqual([]);
      expect(aliasMap.getDocs('c')).toEqual([]);
    });
  });

  describe('getDocs', () => {
    it('should return an empty array if no doc matches the alias', () => {
      const d = {aliases: ['a', 'b', 'c']};
      expect(aliasMap.getDocs('d')).toEqual([]);
    });
  });

  describe('removeDoc', () => {
    it('should remove the doc from any parts of the aliasMap', () => {
      const d1 = {aliases: ['a', 'b1']};
      const d2 = {aliases: ['a', 'b2']};
      aliasMap.addDoc(d1);
      aliasMap.addDoc(d2);
      expect(aliasMap.getDocs('a')).toEqual([d1, d2]);
      expect(aliasMap.getDocs('b1')).toEqual([d1]);
      expect(aliasMap.getDocs('b2')).toEqual([d2]);
      aliasMap.removeDoc(d1);
      expect(aliasMap.getDocs('a')).toEqual([d2]);
      expect(aliasMap.getDocs('b1')).toEqual([]);
      expect(aliasMap.getDocs('b2')).toEqual([d2]);
    });
  });
});

describe('createDocMessage', () => {
  let createDocMessage;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    createDocMessage = inj.get('createDocMessage');
  });

  it('should generate a message with doc info', () => {
    let msg = createDocMessage('some message', {
      id: 'doc1',
      name: 'doc-one',
      path: 'some/doc1',
      fileInfo: {relativePath: 'some/file.js'},
      startingLine: 10,
      endingLine: 20
    });
    expect(msg).toEqual(
      'some message - doc "doc1" - from file "some/file.js" - starting at line 10, ending at line 20'
    );
    msg = createDocMessage('some message', {
      name: 'doc-one',
      path: 'some/doc1',
      fileInfo: {relativePath: 'some/file.js'},
      startingLine: 10
    });
    expect(msg).toEqual(
      'some message - doc "doc-one" - from file "some/file.js" - starting at line 10'
    );
    msg = createDocMessage('some message', {
      path: 'some/doc1',
      fileInfo: {relativePath: 'some/file.js'}
    });
    expect(msg).toEqual(
      'some message - doc "some/doc1" - from file "some/file.js"'
    );
    msg = createDocMessage('some message', {path: 'some/doc1'});
    expect(msg).toEqual('some message - doc "some/doc1"');
    msg = createDocMessage('some message', {
      fileInfo: {relativePath: 'some/file.js'}
    });
    expect(msg).toEqual('some message - doc - from file "some/file.js"');
  });

  it('should be able to wrap an original error', () => {
    let caught = false;
    try {
      throw new Error('original error');
    } catch (originalError) {
      caught = true;
      const message = createDocMessage(
        'some message',
        {
          id: 'doc1',
          name: 'doc-one',
          path: 'some/doc1',
          fileInfo: {relativePath: 'some/file.js'},
          startingLine: 10,
          endingLine: 20
        },
        originalError
      );
      expect(message).toContain('original error');
    }
    expect(caught).toBe(true);
  });
});

describe('code utility', () => {
  let encodeCodeBlock;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    encodeCodeBlock = inj.get('encodeCodeBlock');
  });

  it('should wrap the string in code and pre tags', () => {
    expect(encodeCodeBlock('abc')).toEqual('<pre><code>abc</code></pre>');
  });

  it('should HTML encode the string', () => {
    expect(encodeCodeBlock('<div>&</div>')).toEqual(
      '<pre><code>&lt;div&gt;&amp;&lt;/div&gt;</code></pre>'
    );
  });

  it('should encode HTML entities', () => {
    expect(encodeCodeBlock('<div>&#10;</div>')).toEqual(
      '<pre><code>&lt;div&gt;&amp;#10;&lt;/div&gt;</code></pre>'
    );
  });

  describe('inline', () => {
    it('should only wrap in a code tag', () => {
      expect(encodeCodeBlock('abc', true)).toEqual('<code>abc</code>');
    });
  });

  describe('language', () => {
    it('should add a CSS class if a language is specified', () => {
      expect(encodeCodeBlock('abc', true, 'js')).toEqual(
        '<code class="lang-js">abc</code>'
      );
    });
  });
});

describe('extractLinks', () => {
  let extractLinks;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    extractLinks = inj.get('extractLinks');
  });

  it('should extract the hrefs from anchors', () => {
    expect(extractLinks('<a href="foo">bar</a>').hrefs).toEqual(['foo']);
    expect(
      extractLinks('<a href="foo">bar</a><a href="man">shell</a>').hrefs
    ).toEqual(['foo', 'man']);
    expect(extractLinks('<div href="foo">bar</div>').hrefs).toEqual([]);
  });

  it('should extract the names from anchors', () => {
    expect(
      extractLinks('<a name="foo">bar</a><a href="man">shell</a>').names
    ).toEqual(['foo']);
    expect(extractLinks('<div name="foo">bar</div>').names).toEqual([]);
  });

  it('should extract the ids from elements', () => {
    expect(
      extractLinks('<a id="foo">bar</a><a href="man">shell</a>').names
    ).toEqual(['foo']);
    expect(extractLinks('<div id="foo">bar</div>').names).toEqual(['foo']);
  });
});

describe('resolveUrl', () => {
  let resolveUrl;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    resolveUrl = inj.get('resolveUrl');
  });

  it('should calculate absolute paths', () => {
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html',
        ''
      )
    ).toEqual('/absolutePath/absoluteFile.html');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html',
        '/'
      )
    ).toEqual('/absolutePath/absoluteFile.html');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html',
        '/base'
      )
    ).toEqual('/absolutePath/absoluteFile.html');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html',
        '/base/'
      )
    ).toEqual('/absolutePath/absoluteFile.html');
  });

  it('should use the base path when the path is relative and there is a base path', () => {
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        'relativePath/relativeFile.html',
        '/'
      )
    ).toEqual('relativePath/relativeFile.html');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        'relativePath/relativeFile.html',
        '/base'
      )
    ).toEqual('base/relativePath/relativeFile.html');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        'relativePath/relativeFile.html',
        '/base/'
      )
    ).toEqual('base/relativePath/relativeFile.html');
  });

  it('should use the current directory when there is no base path', () => {
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        'relativePath/relativeFile.html',
        ''
      )
    ).toEqual('currentPath/relativePath/relativeFile.html');
    expect(
      resolveUrl(
        'onePath/currentPath/currentFile.html',
        'relativePath/relativeFile.html',
        ''
      )
    ).toEqual('onePath/currentPath/relativePath/relativeFile.html');
    expect(
      resolveUrl('currentFile.html', 'relativePath/relativeFile.html', '')
    ).toEqual('relativePath/relativeFile.html');
    expect(resolveUrl('', 'relativePath/relativeFile.html', '')).toEqual(
      'relativePath/relativeFile.html'
    );
    expect(resolveUrl(undefined, 'relativePath/relativeFile.html', '')).toEqual(
      'relativePath/relativeFile.html'
    );
  });

  it('should remove any query params', () => {
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html?foo=bar',
        ''
      )
    ).toEqual('/absolutePath/absoluteFile.html');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html#foo',
        ''
      )
    ).toEqual('/absolutePath/absoluteFile.html#foo');
    expect(
      resolveUrl(
        'currentPath/currentFile.html',
        '/absolutePath/absoluteFile.html?bar=baz#foo',
        ''
      )
    ).toEqual('/absolutePath/absoluteFile.html#foo');
    expect(
      resolveUrl(
        'onePath/currentPath/currentFile.html?foo=bar',
        'relativePath/relativeFile.html',
        ''
      )
    ).toEqual('onePath/currentPath/relativePath/relativeFile.html');
    expect(
      resolveUrl(
        'onePath/currentPath/currentFile.html#foo',
        'relativePath/relativeFile.html',
        ''
      )
    ).toEqual('onePath/currentPath/relativePath/relativeFile.html');
    expect(
      resolveUrl(
        'onePath/currentPath/currentFile.html',
        'relativePath/relativeFile.html?foo=bar',
        ''
      )
    ).toEqual('onePath/currentPath/relativePath/relativeFile.html');
    expect(
      resolveUrl(
        'onePath/currentPath/currentFile.html',
        'relativePath/relativeFile.html#foo',
        ''
      )
    ).toEqual('onePath/currentPath/relativePath/relativeFile.html#foo');
    expect(
      resolveUrl(
        'onePath/currentPath/currentFile.html',
        'relativePath/relativeFile.html?bar=baz#foo',
        ''
      )
    ).toEqual('onePath/currentPath/relativePath/relativeFile.html#foo');
  });

  it('should not remove filename if there is only a hash', () => {
    expect(resolveUrl('xx/yy', '#xyz', '')).toEqual('xx/yy#xyz');
    expect(resolveUrl('xx', '#xyz', '')).toEqual('xx#xyz');
  });

  it('should remove any /./ in the path', () => {
    expect(
      resolveUrl('currentFile.html', '/./absolutePath/./absoluteFile.html', '')
    ).toEqual('/absolutePath/absoluteFile.html');
  });

  it("should encode any ' in the path", () => {
    expect(resolveUrl('currentFile.html', "/abc'def.html", '')).toEqual(
      '/abc%27def.html'
    );
  });
});

describe('templateFinder', () => {
  let templateFinder;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    templateFinder = inj.get('templateFinder');
  });

  describe('getFinder', () => {
    let glob, patterns, templateFolders, findTemplate;

    beforeEach(() => {
      glob = templateFinderFactory.__get__('glob');
      spyOn(glob, 'sync').and.returnValue([
        'a.x',
        'b.x',
        'c.x',
        'c.a.x',
        'f.other'
      ]);
      patterns = [
        '${doc.id}.${doc.docType}.x',
        '${doc.id}.x',
        '${doc.docType}.x'
      ];
      templateFolders = ['abc'];
      templateFinder.templateFolders = templateFolders;
      templateFinder.templatePatterns = patterns;
      findTemplate = templateFinder.getFinder();
    });

    it('should match id followed by doctype if both are provided and the file exists', () => {
      expect(findTemplate({docType: 'a', id: 'c'})).toEqual('c.a.x');
    });

    it('should match id before docType', () => {
      expect(findTemplate({docType: 'a', id: 'b'})).toEqual('b.x');
    });

    it("should match docType if id doesn't match", () => {
      expect(findTemplate({docType: 'a', id: 'missing'})).toEqual('a.x');
    });

    it('should match docType if id is undefined', () => {
      expect(findTemplate({docType: 'a'})).toEqual('a.x');
    });

    it('should throw an error if no template was found', () => {
      expect(() => {
        findTemplate({docType: 'missing'});
      }).toThrow();
    });
  });
});

describe('trimIndentation', () => {
  let trimIndentation;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const inj = dgeni.configure();
    trimIndentation = inj.get('trimIndentation');
  });

  it('should trim simple leading white-space from a single line of text', () => {
    expect(trimIndentation('   abc  ')).toEqual('abc  ');
  });

  it('should trim excess indentation from multi-line text ', () => {
    expect(trimIndentation('abc\n     xyz\n     123\n\n')).toEqual(
      'abc\nxyz\n123'
    );
    expect(trimIndentation('  abc\n     xyz\n     123\n\n')).toEqual(
      'abc\n   xyz\n   123'
    );
    expect(trimIndentation(' abc\n  xyz\n   123\n\n')).toEqual(
      'abc\n xyz\n  123'
    );
  });

  it('should remove leading empty lines', () => {
    expect(trimIndentation('\n\n\nabc')).toEqual('abc');
    expect(trimIndentation('\n\n\n   abc')).toEqual('abc');
  });

  it('should remove trailing empty lines', () => {
    expect(trimIndentation('abc\n\n\n')).toEqual('abc');
  });

  it('should not trim indentation if more than the first line is not indented', () => {
    expect(
      trimIndentation(
        '.ng-hide {\n' +
          '  /&#42; this is just another form of hiding an element &#42;/\n' +
          '  display:block!important;\n' +
          '  position:absolute;\n' +
          '  top:-9999px;\n' +
          '  left:-9999px;\n' +
          '}'
      )
    ).toEqual(
      '.ng-hide {\n' +
        '  /&#42; this is just another form of hiding an element &#42;/\n' +
        '  display:block!important;\n' +
        '  position:absolute;\n' +
        '  top:-9999px;\n' +
        '  left:-9999px;\n' +
        '}'
    );
  });

  it('should cope with an empty code block', () => {
    expect(trimIndentation('\n\n')).toEqual('');
  });

  describe('calcIndent', () => {
    it('should calculate simple leading white-space from a single line of text', () => {
      expect(trimIndentation.calcIndent('   abc  ')).toEqual(3);
    });

    it('should trim excess indentation from multi-line text ', () => {
      expect(trimIndentation.calcIndent('abc\n     xyz\n     123\n\n')).toEqual(
        5
      );
      expect(
        trimIndentation.calcIndent('  abc\n     xyz\n     123\n\n')
      ).toEqual(2);
      expect(trimIndentation.calcIndent(' abc\n  xyz\n   123\n\n')).toEqual(1);
    });

    it('should cope with an empty code block', () => {
      expect(trimIndentation.calcIndent('\n\n')).toEqual(9999);
    });
  });

  describe('reindent', () => {
    it('should add whitespace to the start of each line', () => {
      expect(trimIndentation.reindent('abc\n  xyz', 4)).toEqual(
        '    abc\n      xyz'
      );
    });
  });
});
