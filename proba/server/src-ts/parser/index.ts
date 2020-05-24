export {
  AST,
  parse,
  parseAndGenerateServices,
  ParseAndGenerateServicesResult,
} from './parser';
export { ParserServices, TSESTreeOptions } from './parser-options';
export { simpleTraverse } from './simple-traverse';
export { visitorKeys } from './visitor-keys';
export * from './ts-estree';
export { clearCaches } from './create-program/createWatchProgram';

export { parse, parseForESLint, ParserOptions } from './parser';
export { ParserServices } from '@typescript-eslint/typescript-estree';
export { clearCaches } from '@typescript-eslint/typescript-estree';

// note - cannot migrate this to an import statement because it will make TSC copy the package.json to the dist folder
export const version: string = require('../package.json').version;
