import {Declaration, Symbol} from 'typescript';
import {ClassLikeExportDoc} from './ClassLikeExportDoc';
import {ModuleDoc} from './ModuleDoc';
import {Host} from '../services/ts-host/host';

/**
 * Interfaces are class-like but can also have multiple declarations that are merged together
 */
export class InterfaceExportDoc extends ClassLikeExportDoc {
  docType = 'interface';
  additionalDeclarations: Declaration[] = [];

  constructor(
    host: Host,
    moduleDoc: ModuleDoc,
    symbol: Symbol,
    aliasSymbol?: Symbol
  ) {
    super(
      host,
      moduleDoc,
      symbol,
      symbol.valueDeclaration || symbol.getDeclarations()![0]!,
      aliasSymbol
    );

    if (symbol.members) {
      this.members = this.getMemberDocs(symbol.members, true);
    }

    this.additionalDeclarations = symbol
      .getDeclarations()!
      .filter(declaration => declaration !== this.declaration);
  }
}
