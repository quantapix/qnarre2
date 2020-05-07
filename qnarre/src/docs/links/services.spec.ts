import mockPackage from '../mock';
import Dgeni from '..';
import {getAliases} from './services';

describe('getAliases', () => {
  it('should extract all the parts from a code name', () => {
    const aliases = getAliases();
    expect(aliases({id: 'module:ng.service:$http#get'})).toEqual([
      '$http#get',
      'service:$http#get',
      'ng.$http#get',
      'module:ng.$http#get',
      'ng.service:$http#get',
      'module:ng.service:$http#get',
      'get'
    ]);
  });
});

describe('getDocFromAlias', () => {
  let doc, map;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    map = injector.get('aliasMap');
    doc = injector.get('getDocFromAlias');
  });

  it('should return an array of docs that match the alias', () => {
    const doc1 = {aliases: ['a', 'b', 'c']};
    const doc2 = {aliases: ['a', 'b']};
    const doc3 = {aliases: ['a']};
    map.addDoc(doc1);
    map.addDoc(doc2);
    map.addDoc(doc3);
    expect(doc('a')).toEqual([doc1, doc2, doc3]);
    expect(doc('b')).toEqual([doc1, doc2]);
    expect(doc('c')).toEqual([doc1]);
  });

  it("should return docs that match the alias and originating doc's area", () => {
    const doc1 = {aliases: ['a'], area: 'api'};
    const doc2 = {aliases: ['a'], area: 'api'};
    const doc3 = {aliases: ['a'], area: 'other'};
    map.addDoc(doc1);
    map.addDoc(doc2);
    map.addDoc(doc3);
    expect(doc('a', {area: 'api'})).toEqual([doc1, doc2]);
  });

  it("should return docs that match the alias and originating doc's area and module", () => {
    const doc1 = {aliases: ['a'], area: 'api', module: 'ng'};
    const doc2 = {aliases: ['a'], area: 'api', module: 'ngMock'};
    const doc3 = {aliases: ['a'], area: 'other', module: 'ng'};
    map.addDoc(doc1);
    map.addDoc(doc2);
    map.addDoc(doc3);
    expect(doc('a', {area: 'api', module: 'ng'})).toEqual([doc1]);
  });
});
