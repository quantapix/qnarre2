export {
  AST,
  parse,
  parseAndGenerateServices,
  ParseAndGenerateServicesResult,
  parseForESLint,
  ParserOptions,
} from './parser';
export { ParserServices, TSESTreeOptions } from './parser-options';
export { simpleTraverse } from './simple-traverse';
export { visitorKeys } from './visitor-keys';
export * from './ts-estree';
export { clearCaches } from './program';

// note - cannot migrate this to an import statement because it will make TSC copy the package.json to the dist folder
export const version: string = require('../package.json').version;
