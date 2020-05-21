import * as vsc from 'vscode';
import * as proto from '../protocol';
import * as qs from '../service';
import * as qr from '../utils/registration';

import {
  TokenType,
  TokenModifier,
  TokenEncodingConsts,
  VersionRequirement,
} from './node_modules/typescript-vscode-sh-plugin/lib/constants';

class SemanticTokens
  implements vsc.SemanticTokens, vsc.DocumentRangeSemanticTokensProvider {
  constructor(private readonly client: qs.IServiceClient) {}

  getLegend(): vsc.SemanticTokensLegend {
    return new vsc.SemanticTokensLegend(tokenTypes, tokenModifiers);
  }

  async provideDocumentSemanticTokens(
    document: vsc.TextDocument,
    ct: vsc.CancellationToken
  ): Promise<vsc.SemanticTokens | null> {
    const file = this.client.toOpenedPath(document);
    if (!file || document.getText().length > CONTENT_LENGTH_LIMIT) {
      return null;
    }
    return this._provideSemanticTokens(
      document,
      { file, start: 0, length: document.getText().length },
      ct
    );
  }

  async provideDocumentRangeSemanticTokens(
    document: vsc.TextDocument,
    range: vsc.Range,
    ct: vsc.CancellationToken
  ): Promise<vsc.SemanticTokens | null> {
    const file = this.client.toOpenedPath(document);
    if (
      !file ||
      document.offsetAt(range.end) - document.offsetAt(range.start) > CONTENT_LENGTH_LIMIT
    ) {
      return null;
    }

    const start = document.offsetAt(range.start);
    const length = document.offsetAt(range.end) - start;
    return this._provideSemanticTokens(document, { file, start, length }, ct);
  }

  async _provideSemanticTokens(
    document: vsc.TextDocument,
    requestArg: Experimentalprotocol.EncodedSemanticClassificationsRequestArgs,
    ct: vsc.CancellationToken
  ): Promise<vsc.SemanticTokens | null> {
    const file = this.client.toOpenedPath(document);
    if (!file) {
      return null;
    }

    const versionBeforeRequest = document.version;

    const response = await (this
      .client as Experimentalprotocol.IExtendedServiceClient).execute(
      'encodedSemanticClassifications-full',
      requestArg,
      ct
    );
    if (response.type !== 'response' || !response.body) {
      return null;
    }
    const versionAfterRequest = document.version;
    if (versionBeforeRequest !== versionAfterRequest) {
      await waitForDocumentChangesToEnd(document);

      throw new Error('busy');
    }
    const tokenSpan = response.body.spans;
    const builder = new vsc.SemanticTokensBuilder();
    let i = 0;
    while (i < tokenSpan.length) {
      const offset = tokenSpan[i++];
      const length = tokenSpan[i++];
      const tsClassification = tokenSpan[i++];
      let tokenModifiers = 0;
      let tokenType = getTokenTypeFromClassification(tsClassification);
      if (tokenType !== undefined) {
        tokenModifiers = getTokenModifierFromClassification(tsClassification);
      } else {
        tokenType = tokenTypeMap[tsClassification];
        if (tokenType === undefined) {
          continue;
        }
      }
      const startPos = document.positionAt(offset);
      const endPos = document.positionAt(offset + length);
      for (let line = startPos.line; line <= endPos.line; line++) {
        const startCharacter = line === startPos.line ? startPos.character : 0;
        const endCharacter =
          line === endPos.line ? endPos.character : document.lineAt(line).text.length;
        builder.push(
          line,
          startCharacter,
          endCharacter - startCharacter,
          tokenType,
          tokenModifiers
        );
      }
    }
    return builder.build();
  }
}

function waitForDocumentChangesToEnd(document: vsc.TextDocument) {
  let version = document.version;
  return new Promise((s) => {
    const iv = setInterval((_) => {
      if (document.version === version) {
        clearInterval(iv);
        s();
      }
      version = document.version;
    }, 400);
  });
}

function getTokenTypeFromClassification(tsClassification: number): number | undefined {
  if (tsClassification > TokenEncodingConsts.modifierMask) {
    return (tsClassification >> TokenEncodingConsts.typeOffset) - 1;
  }
  return;
}

function getTokenModifierFromClassification(tsClassification: number) {
  return tsClassification & TokenEncodingConsts.modifierMask;
}

const tokenTypes: string[] = [];
tokenTypes[TokenType.class] = 'class';
tokenTypes[TokenType.enum] = 'enum';
tokenTypes[TokenType.interface] = 'interface';
tokenTypes[TokenType.namespace] = 'namespace';
tokenTypes[TokenType.typeParameter] = 'typeParameter';
tokenTypes[TokenType.type] = 'type';
tokenTypes[TokenType.parameter] = 'parameter';
tokenTypes[TokenType.variable] = 'variable';
tokenTypes[TokenType.enumMember] = 'enumMember';
tokenTypes[TokenType.property] = 'property';
tokenTypes[TokenType.function] = 'function';
tokenTypes[TokenType.member] = 'member';

const tokenModifiers: string[] = [];
tokenModifiers[TokenModifier.async] = 'async';
tokenModifiers[TokenModifier.declaration] = 'declaration';
tokenModifiers[TokenModifier.readonly] = 'readonly';
tokenModifiers[TokenModifier.static] = 'static';
tokenModifiers[TokenModifier.local] = 'local';
tokenModifiers[TokenModifier.defaultLibrary] = 'defaultLibrary';

if (tokenTypes.filter((t) => !!t).length !== TokenType._) {
  console.warn('typescript-vscode-sh-plugin has added new tokens types.');
}
if (tokenModifiers.filter((t) => !!t).length !== TokenModifier._) {
  console.warn('typescript-vscode-sh-plugin has added new tokens modifiers.');
}

const tokenTypeMap: number[] = [];
tokenTypeMap[Experimentalprotocol.ClassificationType.className] = TokenType.class;
tokenTypeMap[Experimentalprotocol.ClassificationType.enumName] = TokenType.enum;
tokenTypeMap[Experimentalprotocol.ClassificationType.interfaceName] = TokenType.interface;
tokenTypeMap[Experimentalprotocol.ClassificationType.moduleName] = TokenType.namespace;
tokenTypeMap[Experimentalprotocol.ClassificationType.typeParameterName] =
  TokenType.typeParameter;
tokenTypeMap[Experimentalprotocol.ClassificationType.typeAliasName] = TokenType.type;
tokenTypeMap[Experimentalprotocol.ClassificationType.parameterName] = TokenType.parameter;

namespace Experimentalprotocol {
  export interface IExtendedServiceClient {
    execute<K extends keyof Experimentalprotocol.ExtendedTsServerRequests>(
      command: K,
      args: Experimentalprotocol.ExtendedTsServerRequests[K][0],
      ct: vsc.CancellationToken,
      config?: qs.ExecConfig
    ): Promise<
      qs.ServerResponse.Response<Experimentalprotocol.ExtendedTsServerRequests[K][1]>
    >;
  }

  export interface EncodedSemanticClassificationsRequest extends proto.FileRequest {
    arguments: EncodedSemanticClassificationsRequestArgs;
  }

  export interface EncodedSemanticClassificationsRequestArgs
    extends proto.FileRequestArgs {
    start: number;
    length: number;
  }

  export const enum EndOfLineState {
    None,
    InMultiLineCommentTrivia,
    InSingleQuoteStringLiteral,
    InDoubleQuoteStringLiteral,
    InTemplateHeadOrNoSubstitutionTemplate,
    InTemplateMiddleOrTail,
    InTemplateSubstitutionPosition,
  }

  export const enum ClassificationType {
    comment = 1,
    identifier = 2,
    keyword = 3,
    numericLiteral = 4,
    operator = 5,
    stringLiteral = 6,
    regularExpressionLiteral = 7,
    whiteSpace = 8,
    text = 9,
    punctuation = 10,
    className = 11,
    enumName = 12,
    interfaceName = 13,
    moduleName = 14,
    typeParameterName = 15,
    typeAliasName = 16,
    parameterName = 17,
    docCommentTagName = 18,
    jsxOpenTagName = 19,
    jsxCloseTagName = 20,
    jsxSelfClosingTagName = 21,
    jsxAttribute = 22,
    jsxText = 23,
    jsxAttributeStringLiteralValue = 24,
    bigintLiteral = 25,
  }

  export interface EncodedSemanticClassificationsResponse extends proto.Response {
    body?: {
      endOfLineState: EndOfLineState;
      spans: number[];
    };
  }

  export interface ExtendedTsServerRequests {
    'encodedSemanticClassifications-full': [
      Experimentalprotocol.EncodedSemanticClassificationsRequestArgs,
      Experimentalprotocol.EncodedSemanticClassificationsResponse
    ];
  }
}

const CONTENT_LENGTH_LIMIT = 100000;

export function register(selector: vsc.DocumentSelector, client: qs.IServiceClient) {
  return new qr.VersionDependent(client, qr.API.default, () => {
    const provider = new SemanticTokens(client);
    return vsc.Disposable.from(
      vsc.languages.registerDocumentRangeSemanticTokensProvider(
        selector,
        provider,
        provider.getLegend()
      )
    );
  });
}
