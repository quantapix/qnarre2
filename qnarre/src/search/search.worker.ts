/// <reference lib="webworker" />
import {Message} from './worker';
import * as lunr from 'lunr';

const SEARCH_TERMS_URL = '/generated/docs/app/search-data.json';
let index: lunr.Index;
const pages: SearchInfo = {};

interface PageInfo {
  path: string;
  type: string;
  titleWords: string;
  keyWords: string;
}

interface SearchInfo {
  [key: string]: PageInfo;
}

addEventListener('message', handleMessage);

function createIndex(fn: IndexLoader): lunr.Index {
  const lexer = ((lunr as any) as {QueryLexer: {termSeparator: RegExp}})
    .QueryLexer;
  lexer.termSeparator = lunr.tokenizer.separator = /\s+/;
  return lunr(
    /** @this */ function() {
      this.ref('path');
      this.field('titleWords', {boost: 10});
      this.field('headingWords', {boost: 5});
      this.field('members', {boost: 4});
      this.field('keywords', {boost: 2});
      fn(this);
    }
  );
}

function handleMessage(message: {data: Message}) {
  const type = message.data.type;
  const id = message.data.id;
  const payload = message.data.payload;
  switch (type) {
    case 'load-index':
      makeRequest(SEARCH_TERMS_URL, function(searchInfo: PageInfo[]) {
        index = createIndex(loadIndex(searchInfo));
        postMessage({type, id, payload: true});
      });
      break;
    case 'query-index':
      postMessage({
        type,
        id,
        payload: {query: payload, results: queryIndex(payload)}
      });
      break;
    default:
      postMessage({type, id, payload: {error: 'invalid message type'}});
  }
}

function makeRequest(url: string, callback: (response: any) => void) {
  const req = new XMLHttpRequest();
  req.onload = function() {
    callback(JSON.parse(this.responseText));
  };
  req.open('GET', url);
  req.send();
}

function loadIndex(ps: PageInfo[]): IndexLoader {
  return (indexBuilder: lunr.Builder) => {
    ps.forEach(p => {
      indexBuilder.add(p);
      ps[p.path] = p;
    });
  };
}

function queryIndex(query: string): PageInfo[] {
  try {
    if (query.length) {
      let rs = index.search(query);
      if (rs.length === 0) {
        const titleQuery = 'titleWords:*' + query.split(' ', 1)[0] + '*';
        rs = index.search(query + ' ' + titleQuery);
      }
      return rs.map(hit => pages[hit.ref]);
    }
  } catch (e) {
    console.log(e);
  }
  return [];
}

type IndexLoader = (indexBuilder: lunr.Builder) => void;
