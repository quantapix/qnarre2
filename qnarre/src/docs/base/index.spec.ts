import path from 'path';
import {Dgeni, Doc, Package} from '..';
import basePackage from '.';
import {mockPackage} from './packages';

describe('base package', () => {
  function runDgeni(docs: Doc[]) {
    const testPackage = new Package('testPackage', [mockPackage()])
      .addProcessor('provideTestDocs', () => {
        return {
          $runBefore: ['computeIdsProcessor'],
          $process() {
            return docs;
          }
        };
      })
      .addConfig(
        (
          readFilesProcessor,
          writeFilesProcessor,
          renderDocsProcessor,
          unescapeCommentsProcessor
        ) => {
          readFilesProcessor.$enabled = false;
          writeFilesProcessor.$enabled = false;
          renderDocsProcessor.$enabled = false;
          unescapeCommentsProcessor.$enabled = false;
        }
      )
      .addConfig(computeIdsProcessor => {
        computeIdsProcessor.idTemplates.push({
          docTypes: ['service', 'guide'],
          getId(doc: Doc) {
            return doc.docType + ':' + doc.fileInfo.baseName;
          },
          getAliases(doc: Doc) {
            return [doc.fileInfo.baseName, doc.fileInfo.relativePath];
          }
        });
      })
      .addConfig(computePathsProcessor => {
        computePathsProcessor.pathTemplates = [
          {
            docTypes: ['service', 'guide'],
            getPath(doc: Doc) {
              let docPath = path.dirname(doc.fileInfo.relativePath);
              if (doc.fileInfo.baseName !== 'index') {
                docPath = path.join(docPath, doc.fileInfo.baseName);
              }
              return docPath;
            },
            getOutputPath(doc: Doc) {
              return (
                doc.path +
                (doc.fileInfo.baseName === 'index' ? '/index.html' : '.html')
              );
            }
          }
        ];
      });
    return new Dgeni([testPackage]).generate();
  }

  it('should be instance of Package', () => {
    expect(basePackage instanceof Package).toBe.truthy();
  });

  describe('computeIdsProcessor', () => {
    it('should use provided id templates', done => {
      const d1 = {
        docType: 'service',
        fileInfo: {relativePath: 'a/b/c/d.js', baseName: 'd'}
      };
      const d2 = {
        docType: 'guide',
        fileInfo: {relativePath: 'x/y/z/index', baseName: 'index'}
      };
      runDgeni([d1, d2]).then(
        ds => {
          const [ds1, ds2] = ds;
          expect(ds1.id).toEqual('service:d');
          expect(ds1.aliases).toEqual(['d', 'a/b/c/d.js']);
          expect(ds2.id).toEqual('guide:index');
          expect(ds2.aliases).toEqual(['index', 'x/y/z/index']);
          done();
        },
        err => {
          console.log('Failed: ', err);
        }
      );
    });
  });

  describe('computePathsProcessor', () => {
    it('should use provided path templates', done => {
      const d1 = {
        docType: 'service',
        fileInfo: {relativePath: 'a/b/c/d.js', baseName: 'd'}
      };
      const d2 = {
        docType: 'guide',
        fileInfo: {relativePath: 'x/y/z/index', baseName: 'index'}
      };
      runDgeni([d1, d2]).then(
        ds => {
          const [ds1, ds2] = ds;
          expect(ds1.path).toEqual('a/b/c/d');
          expect(ds1.outputPath).toEqual('a/b/c/d.html');
          expect(ds2.path).toEqual('x/y/z');
          expect(ds2.outputPath).toEqual('x/y/z/index.html');
          done();
        },
        err => {
          console.log('Failed: ', err);
        }
      );
    });
  });
});
