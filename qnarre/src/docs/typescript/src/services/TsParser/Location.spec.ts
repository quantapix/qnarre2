const path = require('canonical-path');
import {__String} from 'typescript';
import {TsParser} from '../TsParser';
import {Location} from './Location';

describe('Location', () => {
  let parser: TsParser;
  let basePath: string;
  beforeEach(() => {
    parser = new TsParser(require('dgeni/lib/mocks/log')(false));
    basePath = path.resolve(__dirname, '../../mocks');
  });

  it('should contain the start and end line and column of exports', () => {
    const parseInfo = parser.parse(['tsParser/Location.test.ts'], basePath);
    const moduleExports = parseInfo.moduleSymbols[0].exportArray;

    const testClass = moduleExports.find(e => e.name === 'TestClass')!;
    const testClassLocation = new Location(testClass.declarations![0]);
    expect(testClassLocation.start).toEqual({line: 0, character: 0});
    expect(testClassLocation.end).toEqual({line: 14, character: 1});

    const testFunction = moduleExports.find(e => e.name === 'testFunction')!;
    const testFunctionLocation = new Location(testFunction.declarations![0]);
    expect(testFunctionLocation.start).toEqual({line: 14, character: 1});
    expect(testFunctionLocation.end).toEqual({line: 21, character: 1});
  });

  it('should contain the start and end line and column of members', () => {
    const parseInfo = parser.parse(['tsParser/Location.test.ts'], basePath);
    const moduleExports = parseInfo.moduleSymbols[0].exportArray;

    const testClass = moduleExports.find(e => e.name === 'TestClass')!;
    const property1Location = new Location(
      testClass.members!.get('property1' as __String)!.declarations![0]
    );
    expect(property1Location.start).toEqual({line: 3, character: 24});
    expect(property1Location.end).toEqual({line: 7, character: 20});

    const method1Location = new Location(
      testClass.members!.get('method1' as __String)!.declarations![0]
    );
    expect(method1Location.start).toEqual({line: 7, character: 20});
    expect(method1Location.end).toEqual({line: 13, character: 3});
  });
});
