import {Dgeni} from '..';
import {
  processorValidationPackage,
  trackDocLoggerPackage,
  docDiffLoggerPackage
} from './packages';

describe('processorValidation', () => {
  let dgeni, mockLogger;

  beforeEach(() => {
    mockLogger = spy.interface('log', [
      'error',
      'warning',
      'info',
      'debug',
      'silly'
    ]);
    dgeni = new Dgeni();
    const mockLoggerPackage = dgeni.package('mockLogger');
    mockLoggerPackage.factory(function log() {
      return mockLogger;
    });
  });

  it('should set stop on error defaults', () => {
    let stopOnProcessingError, stopOnValidationError;
    dgeni.package('testPackage', [processorValidationPackage]).config(dgeni => {
      stopOnProcessingError = dgeni.stopOnProcessingError;
      stopOnValidationError = dgeni.stopOnValidationError;
    });
    dgeni.configureInjector();
    expect(stopOnProcessingError).toEqual(true);
    expect(stopOnValidationError).toEqual(true);
  });

  it('should fail if processor has an invalid property', () => {
    dgeni
      .package('testPackage', [processorValidationPackage])
      .processor(function testProcessor() {
        return {
          $validate: {x: {presence: true}}
        };
      });
    return dgeni.generate().catch(errors => {
      expect(errors).to.eql([
        {
          processor: 'testProcessor',
          package: 'testPackage',
          errors: {x: ["X can't be blank"]}
        }
      ]);
    });
  });

  it('should not fail if all the processors properties are valid', () => {
    const log = [];
    dgeni
      .package('testPackage', [processorValidationPackage])
      .processor(function testProcessor() {
        return {
          $validate: {x: {presence: true}},
          $process() {
            log.push(this.x);
          }
        };
      })
      .config(testProcessor => {
        testProcessor.x = 'not blank';
      });
    return dgeni.generate().then(() => {
      expect(log).to.eql(['not blank']);
    });
  });

  it('should not fail if stopOnValidationError is false', () => {
    dgeni
      .package('testPackage', [processorValidationPackage])
      .config(dgeni => {
        dgeni.stopOnValidationError = false;
      })
      .processor(function testProcessor() {
        return {
          $validate: {x: {presence: true}}
        };
      });
    return dgeni.generate().then(() => {
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

describe('trackDocLogger', () => {
  let dgeni, mockLogger;
  beforeEach(() => {
    mockLogger = spy.interface('log', [
      'error',
      'warning',
      'info',
      'debug',
      'silly'
    ]);
    dgeni = new Dgeni();
    dgeni.package('mockLogger').factory(function log() {
      return mockLogger;
    });
    dgeni
      .package('testProcessors', [trackDocLoggerPackage])
      .processor('initial', () => {
        return {
          $process() {
            return [
              {id: 1, name: 'one'},
              {id: 2, name: 'two'},
              {id: 3, name: 'three'}
            ];
          }
        };
      })
      .processor('first', () => {
        return {
          $runAfter: ['initial'],
          $process() {
            /* */
          }
        };
      })
      .processor('second', () => {
        return {
          $runAfter: ['first'],
          $process() {
            return [
              {id: 1, name: 'one', path: '/1'},
              {id: 2, name: 'two', path: '/2'},
              {id: 3, name: 'three', path: '/3'}
            ];
          }
        };
      });
  });

  it('should log each generation of changes to the tracked doc', () => {
    function trackDocWithIdOne(docs) {
      return docs.filter(doc => doc.id === 1);
    }
    dgeni.package('testConfig').config(trackDocLoggerOptions => {
      trackDocLoggerOptions.docsToTrackFn = trackDocWithIdOne;
    });
    return dgeni.generate().then(() => {
      expect(mockLogger.info).toHaveBeenCalledWith('trackDocLogger settings:', {
        docsToTrackFn: trackDocWithIdOne
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'trackDocLogger tracked changes:',
        [
          {processor: 'initial', docs: [{id: 1, name: 'one'}]},
          {processor: 'second', docs: [{id: 1, name: 'one', path: '/1'}]}
        ]
      );
    });
  });
});

describe('docDiffLogger', () => {
  let dgeni, mockLogger;
  beforeEach(() => {
    mockLogger = spy.interface('log', [
      'error',
      'warning',
      'info',
      'debug',
      'silly'
    ]);
    dgeni = new Dgeni();
    dgeni.package('mockLogger').factory(function log() {
      return mockLogger;
    });
    dgeni
      .package('testProcessors', [docDiffLoggerPackage])
      .processor('initial', () => {
        return {
          $process() {
            /* */
          }
        };
      })
      .processor('first', () => {
        return {
          $runAfter: ['initial'],
          $process(docs) {
            docs.push({id: 'doc-1'});
            docs.push({id: 'doc-2'});
          }
        };
      })
      .processor('second', () => {
        return {
          $runAfter: ['first'],
          $process(docs) {
            docs[0].extra = 'stuff';
          }
        };
      });
  });

  it('should log the difference between the first and last processor', () => {
    return dgeni.generate().then(() => {
      expect(mockLogger.info).toHaveBeenCalledWith({
        changed: 'object change',
        value: {
          0: {changed: 'added', value: {id: 'doc-1', extra: 'stuff'}},
          1: {changed: 'added', value: {id: 'doc-2'}}
        }
      });
    });
  });

  it('should log the difference between the start and last processor', () => {
    dgeni.package('testConfig').config(docDiffLoggerOptions => {
      docDiffLoggerOptions.start = 'first';
    });
    return dgeni.generate().then(() => {
      expect(mockLogger.info).toHaveBeenCalledWith({
        changed: 'object change',
        value: {
          0: {changed: 'added', value: {id: 'doc-1', extra: 'stuff'}},
          1: {changed: 'added', value: {id: 'doc-2'}}
        }
      });
    });
  });

  it('should log the difference between the first and end processor', () => {
    dgeni.package('testConfig').config(docDiffLoggerOptions => {
      docDiffLoggerOptions.end = 'first';
    });
    return dgeni.generate().then(() => {
      expect(mockLogger.info).toHaveBeenCalledWith({
        changed: 'object change',
        value: {
          0: {changed: 'added', value: {id: 'doc-1'}},
          1: {changed: 'added', value: {id: 'doc-2'}}
        }
      });
    });
  });

  it('should log the difference between the start and end processor', () => {
    dgeni.package('testConfig').config(docDiffLoggerOptions => {
      docDiffLoggerOptions.start = 'second';
      docDiffLoggerOptions.end = 'second';
    });
    return dgeni.generate().then(() => {
      expect(mockLogger.info).toHaveBeenCalledWith({
        changed: 'object change',
        value: {
          0: {
            changed: 'object change',
            value: {
              id: {changed: 'equal', value: 'doc-1'},
              extra: {changed: 'added', value: 'stuff'}
            }
          },
          1: {
            changed: 'equal',
            value: {id: 'doc-2'}
          }
        }
      });
    });
  });
});
