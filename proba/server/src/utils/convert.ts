import * as cproto from '../protocol.const';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';

export namespace Range {
  export function fromTextSpan(s: proto.TextSpan): vsc.Range {
    return fromLocations(s.start, s.end);
  }

  export function toTextSpan(r: vsc.Range): proto.TextSpan {
    return { start: Position.toLocation(r.start), end: Position.toLocation(r.end) };
  }

  export function fromLocations(s: proto.Location, e: proto.Location): vsc.Range {
    return new vsc.Range(
      Math.max(0, s.line - 1),
      Math.max(s.offset - 1, 0),
      Math.max(0, e.line - 1),
      Math.max(0, e.offset - 1)
    );
  }

  export function toFileRangeRequestArgs(
    file: string,
    r: vsc.Range
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
    r: vsc.Range
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
  export function fromLocation(l: proto.Location): vsc.Position {
    return new vsc.Position(l.line - 1, l.offset - 1);
  }

  export function toLocation(p: vsc.Position): proto.Location {
    return { line: p.line + 1, offset: p.character + 1 };
  }

  export function toFileLocationRequestArgs(
    file: string,
    p: vsc.Position
  ): proto.FileLocationRequestArgs {
    return {
      file,
      line: p.line + 1,
      offset: p.character + 1,
    };
  }
}

export namespace Location {
  export function fromTextSpan(r: vsc.Uri, s: proto.TextSpan): vsc.Location {
    return new vsc.Location(r, Range.fromTextSpan(s));
  }
}

export namespace TextEdit {
  export function fromCodeEdit(e: proto.CodeEdit): vsc.TextEdit {
    return new vsc.TextEdit(Range.fromTextSpan(e), e.newText);
  }
}

export namespace WorkspaceEdit {
  export function fromFileCodeEdits(
    c: qs.IServiceClient,
    es: Iterable<proto.FileCodeEdits>
  ): vsc.WorkspaceEdit {
    return withFileCodeEdits(new vsc.WorkspaceEdit(), c, es);
  }

  export function withFileCodeEdits(
    we: vsc.WorkspaceEdit,
    c: qs.IServiceClient,
    es: Iterable<proto.FileCodeEdits>
  ): vsc.WorkspaceEdit {
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
        return vsc.SymbolKind.Module;
      case cproto.Kind.class:
        return vsc.SymbolKind.Class;
      case cproto.Kind.enum:
        return vsc.SymbolKind.Enum;
      case cproto.Kind.enumMember:
        return vsc.SymbolKind.EnumMember;
      case cproto.Kind.interface:
        return vsc.SymbolKind.Interface;
      case cproto.Kind.indexSignature:
        return vsc.SymbolKind.Method;
      case cproto.Kind.callSignature:
        return vsc.SymbolKind.Method;
      case cproto.Kind.method:
        return vsc.SymbolKind.Method;
      case cproto.Kind.memberVariable:
        return vsc.SymbolKind.Property;
      case cproto.Kind.memberGetAccessor:
        return vsc.SymbolKind.Property;
      case cproto.Kind.memberSetAccessor:
        return vsc.SymbolKind.Property;
      case cproto.Kind.variable:
        return vsc.SymbolKind.Variable;
      case cproto.Kind.let:
        return vsc.SymbolKind.Variable;
      case cproto.Kind.const:
        return vsc.SymbolKind.Variable;
      case cproto.Kind.localVariable:
        return vsc.SymbolKind.Variable;
      case cproto.Kind.alias:
        return vsc.SymbolKind.Variable;
      case cproto.Kind.function:
        return vsc.SymbolKind.Function;
      case cproto.Kind.localFunction:
        return vsc.SymbolKind.Function;
      case cproto.Kind.constructSignature:
        return vsc.SymbolKind.Constructor;
      case cproto.Kind.constructorImplementation:
        return vsc.SymbolKind.Constructor;
      case cproto.Kind.typeParameter:
        return vsc.SymbolKind.TypeParameter;
      case cproto.Kind.string:
        return vsc.SymbolKind.String;
      default:
        return vsc.SymbolKind.Variable;
    }
  }
}
