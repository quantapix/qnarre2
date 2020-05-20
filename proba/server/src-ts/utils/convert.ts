import * as vscode from 'vscode';
import type * as proto from '../protocol';
import * as cproto from '../protocol.const';
import { IServiceClient } from '../service';

export namespace Range {
  export function fromTextSpan(s: proto.TextSpan): vscode.Range {
    return fromLocations(s.start, s.end);
  }

  export function toTextSpan(r: vscode.Range): proto.TextSpan {
    return { start: Position.toLocation(r.start), end: Position.toLocation(r.end) };
  }

  export function fromLocations(s: proto.Location, e: proto.Location): vscode.Range {
    return new vscode.Range(
      Math.max(0, s.line - 1),
      Math.max(s.offset - 1, 0),
      Math.max(0, e.line - 1),
      Math.max(0, e.offset - 1)
    );
  }

  export function toFileRangeRequestArgs(
    file: string,
    r: vscode.Range
  ): proto.FileRangeRequestArgs {
    return {
      file,
      startLine: r.start.line + 1,
      startOffset: r.start.character + 1,
      endLine: r.end.line + 1,
      endOffset: r.end.character + 1,
    };
  }

  export function toFormatRequestArgs(
    file: string,
    r: vscode.Range
  ): proto.FormatRequestArgs {
    return {
      file,
      line: r.start.line + 1,
      offset: r.start.character + 1,
      endLine: r.end.line + 1,
      endOffset: r.end.character + 1,
    };
  }
}

export namespace Position {
  export function fromLocation(l: proto.Location): vscode.Position {
    return new vscode.Position(l.line - 1, l.offset - 1);
  }

  export function toLocation(p: vscode.Position): proto.Location {
    return { line: p.line + 1, offset: p.character + 1 };
  }

  export function toFileLocationRequestArgs(
    file: string,
    p: vscode.Position
  ): proto.FileLocationRequestArgs {
    return {
      file,
      line: p.line + 1,
      offset: p.character + 1,
    };
  }
}

export namespace Location {
  export function fromTextSpan(r: vscode.Uri, s: proto.TextSpan): vscode.Location {
    return new vscode.Location(r, Range.fromTextSpan(s));
  }
}

export namespace TextEdit {
  export function fromCodeEdit(e: proto.CodeEdit): vscode.TextEdit {
    return new vscode.TextEdit(Range.fromTextSpan(e), e.newText);
  }
}

export namespace WorkspaceEdit {
  export function fromFileCodeEdits(
    c: IServiceClient,
    es: Iterable<proto.FileCodeEdits>
  ): vscode.WorkspaceEdit {
    return withFileCodeEdits(new vscode.WorkspaceEdit(), c, es);
  }

  export function withFileCodeEdits(
    we: vscode.WorkspaceEdit,
    c: IServiceClient,
    es: Iterable<proto.FileCodeEdits>
  ): vscode.WorkspaceEdit {
    for (const e of es) {
      const r = c.toResource(e.fileName);
      for (const t of e.textChanges) {
        we.replace(r, Range.fromTextSpan(t), t.newText);
      }
    }
    return we;
  }
}

export namespace SymbolKind {
  export function fromScriptElem(k: proto.ScriptElementKind) {
    switch (k) {
      case cproto.Kind.module:
        return vscode.SymbolKind.Module;
      case cproto.Kind.class:
        return vscode.SymbolKind.Class;
      case cproto.Kind.enum:
        return vscode.SymbolKind.Enum;
      case cproto.Kind.enumMember:
        return vscode.SymbolKind.EnumMember;
      case cproto.Kind.interface:
        return vscode.SymbolKind.Interface;
      case cproto.Kind.indexSignature:
        return vscode.SymbolKind.Method;
      case cproto.Kind.callSignature:
        return vscode.SymbolKind.Method;
      case cproto.Kind.method:
        return vscode.SymbolKind.Method;
      case cproto.Kind.memberVariable:
        return vscode.SymbolKind.Property;
      case cproto.Kind.memberGetAccessor:
        return vscode.SymbolKind.Property;
      case cproto.Kind.memberSetAccessor:
        return vscode.SymbolKind.Property;
      case cproto.Kind.variable:
        return vscode.SymbolKind.Variable;
      case cproto.Kind.let:
        return vscode.SymbolKind.Variable;
      case cproto.Kind.const:
        return vscode.SymbolKind.Variable;
      case cproto.Kind.localVariable:
        return vscode.SymbolKind.Variable;
      case cproto.Kind.alias:
        return vscode.SymbolKind.Variable;
      case cproto.Kind.function:
        return vscode.SymbolKind.Function;
      case cproto.Kind.localFunction:
        return vscode.SymbolKind.Function;
      case cproto.Kind.constructSignature:
        return vscode.SymbolKind.Constructor;
      case cproto.Kind.constructorImplementation:
        return vscode.SymbolKind.Constructor;
      case cproto.Kind.typeParameter:
        return vscode.SymbolKind.TypeParameter;
      case cproto.Kind.string:
        return vscode.SymbolKind.String;
      default:
        return vscode.SymbolKind.Variable;
    }
  }
}
