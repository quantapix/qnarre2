import { Commands } from '../commands';
import { Range } from './textRange';

export const enum DiagnosticCategory {
  Error,
  Warning,
  UnusedCode,
}

export interface DiagnosticAction {
  action: string;
}

export interface CreateTypeStubFileAction extends DiagnosticAction {
  action: Commands.createTypeStub;
  moduleName: string;
}

export interface AddMissingOptionalToParamAction extends DiagnosticAction {
  action: Commands.addMissingOptionalToParam;
  offsetOfTypeNode: number;
}

export interface DiagnosticRelatedInfo {
  message: string;
  filePath: string;
  range: Range;
}

export class Diagnostic {
  private _actions: DiagnosticAction[] | undefined;
  private _rule: string | undefined;
  private _relatedInfo: DiagnosticRelatedInfo[] = [];

  constructor(
    readonly category: DiagnosticCategory,
    readonly message: string,
    readonly range: Range
  ) {}

  addAction(action: DiagnosticAction) {
    if (this._actions === undefined) {
      this._actions = [action];
    } else {
      this._actions.push(action);
    }
  }

  getActions() {
    return this._actions;
  }

  setRule(rule: string) {
    this._rule = rule;
  }

  getRule() {
    return this._rule;
  }

  addRelatedInfo(message: string, filePath: string, range: Range) {
    this._relatedInfo.push({ filePath, message, range });
  }

  getRelatedInfo() {
    return this._relatedInfo;
  }
}

export class DiagnosticAddendum {
  private _messages: string[] = [];
  private _childAddenda: DiagnosticAddendum[] = [];

  addMessage(message: string) {
    this._messages.push(message);
  }

  createAddendum() {
    const newAddendum = new DiagnosticAddendum();
    this.addAddendum(newAddendum);
    return newAddendum;
  }

  getString(maxDepth = 5, maxLineCount = 5): string {
    let lines = this._getLinesRecursive(maxDepth);

    if (lines.length > maxLineCount) {
      lines = lines.slice(0, maxLineCount);
      lines.push('...');
    }

    const text = lines.join('\n');
    if (text.length > 0) {
      return '\n' + text;
    }

    return '';
  }

  getMessageCount() {
    return this._messages.length;
  }

  addAddendum(addendum: DiagnosticAddendum) {
    this._childAddenda.push(addendum);
  }

  private _getLinesRecursive(maxDepth: number): string[] {
    if (maxDepth <= 0) {
      return [];
    }
    const childLines: string[] = [];
    for (const addendum of this._childAddenda) {
      childLines.push(...addendum._getLinesRecursive(maxDepth - 1));
    }
    const extraSpace = this._messages.length > 0 ? '  ' : '';
    return this._messages.concat(childLines).map((line) => extraSpace + line);
  }
}

export const enum DiagnosticRule {
  strictListInference = 'strictListInference',
  strictDictionaryInference = 'strictDictionaryInference',
  strictParameterNoneValue = 'strictParameterNoneValue',
  enableTypeIgnoreComments = 'enableTypeIgnoreComments',

  reportGeneralTypeIssues = 'reportGeneralTypeIssues',
  reportTypeshedErrors = 'reportTypeshedErrors',
  reportMissingImports = 'reportMissingImports',
  reportMissingModuleSource = 'reportMissingModuleSource',
  reportMissingTypeStubs = 'reportMissingTypeStubs',
  reportImportCycles = 'reportImportCycles',
  reportUnusedImport = 'reportUnusedImport',
  reportUnusedClass = 'reportUnusedClass',
  reportUnusedFunction = 'reportUnusedFunction',
  reportUnusedVariable = 'reportUnusedVariable',
  reportDuplicateImport = 'reportDuplicateImport',
  reportOptionalSubscript = 'reportOptionalSubscript',
  reportOptionalMemberAccess = 'reportOptionalMemberAccess',
  reportOptionalCall = 'reportOptionalCall',
  reportOptionalIterable = 'reportOptionalIterable',
  reportOptionalContextManager = 'reportOptionalContextManager',
  reportOptionalOperand = 'reportOptionalOperand',
  reportUntypedFunctionDecorator = 'reportUntypedFunctionDecorator',
  reportUntypedClassDecorator = 'reportUntypedClassDecorator',
  reportUntypedBaseClass = 'reportUntypedBaseClass',
  reportUntypedNamedTuple = 'reportUntypedNamedTuple',
  reportPrivateUsage = 'reportPrivateUsage',
  reportConstantRedefinition = 'reportConstantRedefinition',
  reportIncompatibleMethodOverride = 'reportIncompatibleMethodOverride',
  reportInvalidStringEscapeSequence = 'reportInvalidStringEscapeSequence',
  reportUnknownParameterType = 'reportUnknownParameterType',
  reportUnknownArgumentType = 'reportUnknownArgumentType',
  reportUnknownLambdaType = 'reportUnknownLambdaType',
  reportUnknownVariableType = 'reportUnknownVariableType',
  reportUnknownMemberType = 'reportUnknownMemberType',
  reportCallInDefaultInitializer = 'reportCallInDefaultInitializer',
  reportUnnecessaryIsInstance = 'reportUnnecessaryIsInstance',
  reportUnnecessaryCast = 'reportUnnecessaryCast',
  reportAssertAlwaysTrue = 'reportAssertAlwaysTrue',
  reportSelfClsParameterName = 'reportSelfClsParameterName',
  reportImplicitStringConcatenation = 'reportImplicitStringConcatenation',
  reportUndefinedVariable = 'reportUndefinedVariable',
  reportUnboundVariable = 'reportUnboundVariable',
}
