import * as qb from './base';

export interface SynMap {
  [Syntax.EndOfFileToken]: EndOfFileToken;
  [Syntax.NumericLiteral]: NumericLiteral;
  [Syntax.BigIntLiteral]: BigIntLiteral;
  [Syntax.StringLiteral]: StringLiteral;
  [Syntax.JsxText]: JsxText;
  [Syntax.RegexLiteral]: RegexLiteral;
  [Syntax.NoSubstitutionLiteral]: NoSubstitutionLiteral;

  [Syntax.TemplateHead]: TemplateHead;
  [Syntax.TemplateMiddle]: TemplateMiddle;
  [Syntax.TemplateTail]: TemplateTail;

  [Syntax.DotToken]: DotToken;
  [Syntax.Dot3Token]: Dot3Token;
  [Syntax.QuestionDotToken]: QuestionDotToken;
  [Syntax.EqualsGreaterThanToken]: EqualsGreaterThanToken;
  [Syntax.PlusToken]: PlusToken;
  [Syntax.MinusToken]: MinusToken;
  [Syntax.AsteriskToken]: AsteriskToken;
  [Syntax.ExclamationToken]: ExclamationToken;
  [Syntax.QuestionToken]: QuestionToken;
  [Syntax.ColonToken]: ColonToken;

  [Syntax.EqualsToken]: EqualsToken;

  [Syntax.Identifier]: Identifier;
  [Syntax.PrivateIdentifier]: PrivateIdentifier;
  /*
  [Syntax.Unknown]: Unknown;
  [Syntax.SingleLineCommentTrivia]: SingleLineCommentTrivia;
  [Syntax.MultiLineCommentTrivia]: MultiLineCommentTrivia;
  [Syntax.NewLineTrivia]: NewLineTrivia;
  [Syntax.WhitespaceTrivia]: WhitespaceTrivia;

  [Syntax.ShebangTrivia]: ShebangTrivia;
  [Syntax.ConflictMarkerTrivia]: ConflictMarkerTrivia;
  [Syntax.JsxTextAllWhiteSpaces]: JsxTextAllWhiteSpaces;
  [Syntax.OpenBraceToken]: OpenBraceToken;
  [Syntax.CloseBraceToken]: CloseBraceToken;
  [Syntax.OpenParenToken]: OpenParenToken;
  [Syntax.CloseParenToken]: CloseParenToken;
  [Syntax.OpenBracketToken]: OpenBracketToken;
  [Syntax.CloseBracketToken]: CloseBracketToken;
  [Syntax.SemicolonToken]: SemicolonToken;
  [Syntax.CommaToken]: CommaToken;
  [Syntax.LessThanToken]: LessThanToken;
  [Syntax.LessThanSlashToken]: LessThanSlashToken;
  [Syntax.GreaterThanToken]: GreaterThanToken;
  [Syntax.LessThanEqualsToken]: LessThanEqualsToken;
  [Syntax.GreaterThanEqualsToken]: GreaterThanEqualsToken;
  [Syntax.Equals2Token]: Equals2Token;
  [Syntax.ExclamationEqualsToken]: ExclamationEqualsToken;
  [Syntax.Equals3Token]: Equals3Token;
  [Syntax.ExclamationEquals2Token]: ExclamationEquals2Token;
  [Syntax.Asterisk2Token]: Asterisk2Token;
  [Syntax.SlashToken]: SlashToken;
  [Syntax.PercentToken]: PercentToken;
  [Syntax.Plus2Token]: Plus2Token;
  [Syntax.Minus2Token]: Minus2Token;
  [Syntax.LessThan2Token]: LessThan2Token;
  [Syntax.GreaterThan2Token]: GreaterThan2Token;
  [Syntax.GreaterThan3Token]: GreaterThan3Token;
  [Syntax.AmpersandToken]: AmpersandToken;
  [Syntax.BarToken]: BarToken;
  [Syntax.CaretToken]: CaretToken;
  [Syntax.TildeToken]: TildeToken;
  [Syntax.Ampersand2Token]: Ampersand2Token;
  [Syntax.Bar2Token]: Bar2Token;
  [Syntax.AtToken]: AtToken;
  [Syntax.Question2Token]: Question2Token;
  [Syntax.BacktickToken]: BacktickToken;
  [Syntax.PlusEqualsToken]: PlusEqualsToken;
  [Syntax.MinusEqualsToken]: MinusEqualsToken;
  [Syntax.AsteriskEqualsToken]: AsteriskEqualsToken;
  [Syntax.Asterisk2EqualsToken]: Asterisk2EqualsToken;
  [Syntax.SlashEqualsToken]: SlashEqualsToken;
  [Syntax.PercentEqualsToken]: PercentEqualsToken;
  [Syntax.LessThan2EqualsToken]: LessThan2EqualsToken;
  [Syntax.GreaterThan2EqualsToken]: GreaterThan2EqualsToken;
  [Syntax.GreaterThan3EqualsToken]: GreaterThan3EqualsToken;
  [Syntax.AmpersandEqualsToken]: AmpersandEqualsToken;
  [Syntax.BarEqualsToken]: BarEqualsToken;
  [Syntax.CaretEqualsToken]: CaretEqualsToken;
  [Syntax.BreakKeyword]: BreakKeyword;
  [Syntax.CaseKeyword]: CaseKeyword;
  [Syntax.CatchKeyword]: CatchKeyword;
  [Syntax.ClassKeyword]: ClassKeyword;
  [Syntax.ConstKeyword]: ConstKeyword;
  [Syntax.ContinueKeyword]: ContinueKeyword;
  [Syntax.DebuggerKeyword]: DebuggerKeyword;
  [Syntax.DefaultKeyword]: DefaultKeyword;
  [Syntax.DeleteKeyword]: DeleteKeyword;
  [Syntax.DoKeyword]: DoKeyword;
  [Syntax.ElseKeyword]: ElseKeyword;
  [Syntax.EnumKeyword]: EnumKeyword;
  [Syntax.ExportKeyword]: ExportKeyword;
  [Syntax.ExtendsKeyword]: ExtendsKeyword;
  [Syntax.FalseKeyword]: FalseKeyword;
  [Syntax.FinallyKeyword]: FinallyKeyword;
  [Syntax.ForKeyword]: ForKeyword;
  [Syntax.FunctionKeyword]: FunctionKeyword;
  [Syntax.IfKeyword]: IfKeyword;
  [Syntax.ImportKeyword]: ImportKeyword;
  [Syntax.InKeyword]: InKeyword;
  [Syntax.InstanceOfKeyword]: InstanceOfKeyword;
  [Syntax.NewKeyword]: NewKeyword;
  [Syntax.NullKeyword]: NullKeyword;
  [Syntax.ReturnKeyword]: ReturnKeyword;
  [Syntax.SuperKeyword]: SuperKeyword;
  [Syntax.SwitchKeyword]: SwitchKeyword;
  [Syntax.ThisKeyword]: ThisKeyword;
  [Syntax.ThrowKeyword]: ThrowKeyword;
  [Syntax.TrueKeyword]: TrueKeyword;
  [Syntax.TryKeyword]: TryKeyword;
  [Syntax.TypeOfKeyword]: TypeOfKeyword;
  [Syntax.VarKeyword]: VarKeyword;
  [Syntax.VoidKeyword]: VoidKeyword;
  [Syntax.WhileKeyword]: WhileKeyword;
  [Syntax.WithKeyword]: WithKeyword;

  [Syntax.ImplementsKeyword]: ImplementsKeyword;
  [Syntax.InterfaceKeyword]: InterfaceKeyword;
  [Syntax.LetKeyword]: LetKeyword;
  [Syntax.PackageKeyword]: PackageKeyword;
  [Syntax.PrivateKeyword]: PrivateKeyword;
  [Syntax.ProtectedKeyword]: ProtectedKeyword;
  [Syntax.PublicKeyword]: PublicKeyword;
  [Syntax.StaticKeyword]: StaticKeyword;
  [Syntax.YieldKeyword]: YieldKeyword;

  [Syntax.AbstractKeyword]: AbstractKeyword;
  [Syntax.AsKeyword]: AsKeyword;
  [Syntax.AssertsKeyword]: AssertsKeyword;
  [Syntax.AnyKeyword]: AnyKeyword;
  [Syntax.AsyncKeyword]: AsyncKeyword;
  [Syntax.AwaitKeyword]: AwaitKeyword;
  [Syntax.BooleanKeyword]: BooleanKeyword;
  [Syntax.ConstructorKeyword]: ConstructorKeyword;
  [Syntax.DeclareKeyword]: DeclareKeyword;
  [Syntax.GetKeyword]: GetKeyword;
  [Syntax.InferKeyword]: InferKeyword;
  [Syntax.IsKeyword]: IsKeyword;
  [Syntax.KeyOfKeyword]: KeyOfKeyword;
  [Syntax.ModuleKeyword]: ModuleKeyword;
  [Syntax.NamespaceKeyword]: NamespaceKeyword;
  [Syntax.NeverKeyword]: NeverKeyword;
  [Syntax.ReadonlyKeyword]: ReadonlyKeyword;
  [Syntax.RequireKeyword]: RequireKeyword;
  [Syntax.NumberKeyword]: NumberKeyword;
  [Syntax.ObjectKeyword]: ObjectKeyword;
  [Syntax.SetKeyword]: SetKeyword;
  [Syntax.StringKeyword]: StringKeyword;
  [Syntax.SymbolKeyword]: SymbolKeyword;
  [Syntax.TypeKeyword]: TypeKeyword;
  [Syntax.UndefinedKeyword]: UndefinedKeyword;
  [Syntax.UniqueKeyword]: UniqueKeyword;
  [Syntax.UnknownKeyword]: UnknownKeyword;
  [Syntax.FromKeyword]: FromKeyword;
  [Syntax.GlobalKeyword]: GlobalKeyword;
  [Syntax.BigIntKeyword]: BigIntKeyword;
  [Syntax.OfKeyword]: OfKeyword;
  */
  [Syntax.QualifiedName]: QualifiedName;
  [Syntax.ComputedPropertyName]: ComputedPropertyName;

  [Syntax.TypeParameter]: TypeParameterDeclaration;
  [Syntax.Parameter]: ParameterDeclaration;
  [Syntax.Decorator]: Decorator;

  [Syntax.PropertySignature]: PropertySignature;
  [Syntax.PropertyDeclaration]: PropertyDeclaration;
  [Syntax.MethodSignature]: MethodSignature;
  [Syntax.MethodDeclaration]: MethodDeclaration;
  [Syntax.Constructor]: ConstructorDeclaration;
  [Syntax.GetAccessor]: GetAccessorDeclaration;
  [Syntax.SetAccessor]: SetAccessorDeclaration;
  [Syntax.CallSignature]: CallSignatureDeclaration;
  [Syntax.ConstructSignature]: ConstructSignatureDeclaration;
  [Syntax.IndexSignature]: IndexSignatureDeclaration;

  [Syntax.TypePredicate]: TypePredicateNode;
  [Syntax.TypeReference]: TypeReferenceNode;
  [Syntax.FunctionType]: FunctionTypeNode;
  [Syntax.ConstructorType]: ConstructorTypeNode;
  [Syntax.TypeQuery]: TypeQueryNode;
  [Syntax.TypeLiteral]: TypeLiteralNode;
  [Syntax.ArrayType]: ArrayTypeNode;
  [Syntax.TupleType]: TupleTypeNode;
  [Syntax.OptionalType]: OptionalTypeNode;
  [Syntax.RestType]: RestTypeNode;
  [Syntax.UnionType]: UnionTypeNode;
  [Syntax.IntersectionType]: IntersectionTypeNode;
  [Syntax.ConditionalType]: ConditionalTypeNode;
  [Syntax.InferType]: InferTypeNode;
  [Syntax.ParenthesizedType]: ParenthesizedTypeNode;
  [Syntax.ThisType]: ThisTypeNode;
  [Syntax.TypeOperator]: TypeOperatorNode;
  [Syntax.IndexedAccessType]: IndexedAccessTypeNode;
  [Syntax.MappedType]: MappedTypeNode;
  [Syntax.LiteralType]: LiteralTypeNode;
  [Syntax.NamedTupleMember]: NamedTupleMember;
  [Syntax.ImportType]: ImportTypeNode;

  [Syntax.ObjectBindingPattern]: ObjectBindingPattern;
  [Syntax.ArrayBindingPattern]: ArrayBindingPattern;
  [Syntax.BindingElement]: BindingElement;

  [Syntax.ArrayLiteralExpression]: ArrayLiteralExpression;
  [Syntax.ObjectLiteralExpression]: ObjectLiteralExpression;
  [Syntax.PropertyAccessExpression]: PropertyAccessExpression;
  [Syntax.ElementAccessExpression]: ElementAccessExpression;
  [Syntax.CallExpression]: CallExpression;
  [Syntax.NewExpression]: NewExpression;
  [Syntax.TaggedTemplateExpression]: TaggedTemplateExpression;
  [Syntax.TypeAssertionExpression]: TypeAssertion;
  [Syntax.ParenthesizedExpression]: ParenthesizedExpression;
  [Syntax.FunctionExpression]: FunctionExpression;
  [Syntax.ArrowFunction]: ArrowFunction;
  [Syntax.DeleteExpression]: DeleteExpression;
  [Syntax.TypeOfExpression]: TypeOfExpression;
  [Syntax.VoidExpression]: VoidExpression;
  [Syntax.AwaitExpression]: AwaitExpression;
  [Syntax.PrefixUnaryExpression]: PrefixUnaryExpression;
  [Syntax.PostfixUnaryExpression]: PostfixUnaryExpression;
  [Syntax.BinaryExpression]: BinaryExpression;
  [Syntax.ConditionalExpression]: ConditionalExpression;
  [Syntax.TemplateExpression]: TemplateExpression;
  [Syntax.YieldExpression]: YieldExpression;
  [Syntax.SpreadElement]: SpreadElement;
  [Syntax.ClassExpression]: ClassExpression;
  [Syntax.OmittedExpression]: OmittedExpression;
  [Syntax.ExpressionWithTypeArguments]: ExpressionWithTypeArguments;
  [Syntax.AsExpression]: AsExpression;
  [Syntax.NonNullExpression]: NonNullExpression;
  [Syntax.MetaProperty]: MetaProperty;
  [Syntax.SyntheticExpression]: SyntheticExpression;

  [Syntax.TemplateSpan]: TemplateSpan;
  [Syntax.SemicolonClassElement]: SemicolonClassElement;

  [Syntax.Block]: Block;
  [Syntax.EmptyStatement]: EmptyStatement;
  [Syntax.VariableStatement]: VariableStatement;
  [Syntax.ExpressionStatement]: ExpressionStatement;
  [Syntax.IfStatement]: IfStatement;
  [Syntax.DoStatement]: DoStatement;
  [Syntax.WhileStatement]: WhileStatement;
  [Syntax.ForStatement]: ForStatement;
  [Syntax.ForInStatement]: ForInStatement;
  [Syntax.ForOfStatement]: ForOfStatement;
  [Syntax.ContinueStatement]: ContinueStatement;
  [Syntax.BreakStatement]: BreakStatement;
  [Syntax.ReturnStatement]: ReturnStatement;
  [Syntax.WithStatement]: WithStatement;
  [Syntax.SwitchStatement]: SwitchStatement;
  [Syntax.LabeledStatement]: LabeledStatement;
  [Syntax.ThrowStatement]: ThrowStatement;
  [Syntax.TryStatement]: TryStatement;
  [Syntax.DebuggerStatement]: DebuggerStatement;
  [Syntax.VariableDeclaration]: VariableDeclaration;
  [Syntax.VariableDeclarationList]: VariableDeclarationList;
  [Syntax.FunctionDeclaration]: FunctionDeclaration;
  [Syntax.ClassDeclaration]: ClassDeclaration;
  [Syntax.InterfaceDeclaration]: InterfaceDeclaration;
  [Syntax.TypeAliasDeclaration]: TypeAliasDeclaration;
  [Syntax.EnumDeclaration]: EnumDeclaration;
  [Syntax.ModuleDeclaration]: ModuleDeclaration;
  [Syntax.ModuleBlock]: ModuleBlock;
  [Syntax.CaseBlock]: CaseBlock;
  [Syntax.NamespaceExportDeclaration]: NamespaceExportDeclaration;
  [Syntax.ImportEqualsDeclaration]: ImportEqualsDeclaration;
  [Syntax.ImportDeclaration]: ImportDeclaration;
  [Syntax.ImportClause]: ImportClause;
  [Syntax.NamespaceImport]: NamespaceImport;
  [Syntax.NamedImports]: NamedImports;
  [Syntax.ImportSpecifier]: ImportSpecifier;
  [Syntax.ExportAssignment]: ExportAssignment;
  [Syntax.ExportDeclaration]: ExportDeclaration;
  [Syntax.NamedExports]: NamedExports;
  [Syntax.NamespaceExport]: NamespaceExport;
  [Syntax.ExportSpecifier]: ExportSpecifier;
  [Syntax.MissingDeclaration]: MissingDeclaration;

  [Syntax.ExternalModuleReference]: ExternalModuleReference;

  [Syntax.JsxElement]: JsxElement;
  [Syntax.JsxSelfClosingElement]: JsxSelfClosingElement;
  [Syntax.JsxOpeningElement]: JsxOpeningElement;
  [Syntax.JsxClosingElement]: JsxClosingElement;
  [Syntax.JsxFragment]: JsxFragment;
  [Syntax.JsxOpeningFragment]: JsxOpeningFragment;
  [Syntax.JsxClosingFragment]: JsxClosingFragment;
  [Syntax.JsxAttribute]: JsxAttribute;
  [Syntax.JsxAttributes]: JsxAttributes;
  [Syntax.JsxSpreadAttribute]: JsxSpreadAttribute;
  [Syntax.JsxExpression]: JsxExpression;

  [Syntax.CaseClause]: CaseClause;
  [Syntax.DefaultClause]: DefaultClause;
  [Syntax.HeritageClause]: HeritageClause;
  [Syntax.CatchClause]: CatchClause;

  [Syntax.PropertyAssignment]: PropertyAssignment;
  [Syntax.ShorthandPropertyAssignment]: ShorthandPropertyAssignment;
  [Syntax.SpreadAssignment]: SpreadAssignment;

  [Syntax.EnumMember]: EnumMember;

  [Syntax.UnparsedPrologue]: UnparsedPrologue;
  [Syntax.UnparsedPrepend]: UnparsedPrepend;
  [Syntax.UnparsedText]: UnparsedTextLike;
  [Syntax.UnparsedInternalText]: UnparsedTextLike;
  [Syntax.UnparsedSyntheticReference]: UnparsedSyntheticReference;

  [Syntax.SourceFile]: SourceFile;
  [Syntax.Bundle]: Bundle;
  [Syntax.UnparsedSource]: UnparsedSource;
  [Syntax.InputFiles]: InputFiles;

  [Syntax.JSDocTypeExpression]: JSDocTypeExpression;
  [Syntax.JSDocAllType]: JSDocAllType;

  [Syntax.JSDocUnknownType]: JSDocUnknownType;
  [Syntax.JSDocNullableType]: JSDocNullableType;
  [Syntax.JSDocNonNullableType]: JSDocNonNullableType;
  [Syntax.JSDocOptionalType]: JSDocOptionalType;
  [Syntax.JSDocFunctionType]: JSDocFunctionType;
  [Syntax.JSDocVariadicType]: JSDocVariadicType;

  [Syntax.JSDocNamepathType]: JSDocNamepathType;
  [Syntax.JSDocComment]: JSDoc;
  [Syntax.JSDocTypeLiteral]: JSDocTypeLiteral;
  [Syntax.JSDocSignature]: JSDocSignature;
  [Syntax.JSDocTag]: JSDocTag;
  [Syntax.JSDocAugmentsTag]: JSDocAugmentsTag;
  [Syntax.JSDocImplementsTag]: JSDocImplementsTag;
  [Syntax.JSDocAuthorTag]: JSDocAuthorTag;
  [Syntax.JSDocClassTag]: JSDocClassTag;
  [Syntax.JSDocPublicTag]: JSDocPublicTag;
  [Syntax.JSDocPrivateTag]: JSDocPrivateTag;
  [Syntax.JSDocProtectedTag]: JSDocProtectedTag;
  [Syntax.JSDocReadonlyTag]: JSDocReadonlyTag;
  [Syntax.JSDocCallbackTag]: JSDocCallbackTag;
  [Syntax.JSDocEnumTag]: JSDocEnumTag;
  [Syntax.JSDocParameterTag]: JSDocParameterTag;
  [Syntax.JSDocReturnTag]: JSDocReturnTag;
  [Syntax.JSDocThisTag]: JSDocThisTag;
  [Syntax.JSDocTypeTag]: JSDocTypeTag;
  [Syntax.JSDocTemplateTag]: JSDocTemplateTag;
  [Syntax.JSDocTypedefTag]: JSDocTypedefTag;
  [Syntax.JSDocPropertyTag]: JSDocPropertyTag;

  [Syntax.SyntaxList]: SyntaxList;

  [Syntax.NotEmittedStatement]: NotEmittedStatement;
  [Syntax.PartiallyEmittedExpression]: PartiallyEmittedExpression;
  [Syntax.CommaListExpression]: CommaListExpression;
  [Syntax.MergeDeclarationMarker]: MergeDeclarationMarker;
  [Syntax.EndOfDeclarationMarker]: EndOfDeclarationMarker;
  [Syntax.SyntheticReferenceExpression]: SyntheticReferenceExpression;

  //[Syntax.Count]: Count;
}

export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;

export namespace Range {
  export interface SourceMap extends qb.Range {
    source?: SourceMapSource;
  }
}
