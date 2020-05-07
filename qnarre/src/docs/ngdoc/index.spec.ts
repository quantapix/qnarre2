import ngdocPackage from '.';
import {Dgeni, Package} from '..';
import mockLog from 'dgeni/lib/mocks/log';

describe('ngdoc package', () => {
  it('should be instance of Package', () => {
    expect(ngdocPackage instanceof Package).toBeTruthy();
  });

  function runDgeni(docs) {
    const testPackage = new Package('testPackage', [ngdocPackage])
      .addFactory('log', () => {
        return mockLog(false);
      })
      .addProcessor('provideTestDocs', () => {
        return {
          $runBefore: ['computePathsProcessor'],
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
      );
    return new Dgeni([testPackage]).generate();
  }

  it('should compute the path of components from their attributes', function(done) {
    const docTypes = [
      'service',
      'provider',
      'directive',
      'input',
      'function',
      'filter',
      'type'
    ];
    const docs = docTypes.map(docType => {
      return {docType, area: 'AREA', module: 'MODULE', name: 'NAME'};
    });
    runDgeni(docs).then(
      docs => {
        for (let i = 0; i < docs.length; i++) {
          expect(docs[i].path).toEqual(
            'AREA/MODULE/' + docs[i].docType + '/NAME'
          );
          expect(docs[i].outputPath).toEqual(
            'partials/AREA/MODULE/' + docs[i].docType + '/NAME.html'
          );
        }
        done();
      },
      err => {
        console.log(err);
        throw err;
      }
    );
  });

  it('should compute the path of modules from their attributes', function(done) {
    const doc = {docType: 'module', area: 'AREA', name: 'MODULE'};
    runDgeni([doc]).then(
      docs => {
        expect(docs[0].path).toEqual('AREA/MODULE');
        expect(docs[0].outputPath).toEqual('partials/AREA/MODULE/index.html');
        done();
      },
      err => {
        console.log(err);
        throw err;
      }
    );
  });

  it('should compute the path of component groups from their attributes', function(done) {
    const groupTypes = [
      'service',
      'provider',
      'directive',
      'input',
      'function',
      'filter',
      'type'
    ];
    const docs = groupTypes.map(groupType => {
      return {
        docType: 'componentGroup',
        area: 'AREA',
        groupType,
        moduleName: 'MODULE'
      };
    });
    runDgeni(docs).then(
      docs => {
        for (let i = 0; i < docs.length; i++) {
          expect(docs[i].path).toEqual('AREA/MODULE/' + docs[i].groupType);
          expect(docs[i].outputPath).toEqual(
            'partials/AREA/MODULE/' + docs[i].groupType + '/index.html'
          );
        }
        done();
      },
      err => {
        console.log(err);
        throw err;
      }
    );
  });
});
