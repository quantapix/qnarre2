import { TextEdit, WorkspaceEdit } from 'vscode-languageserver';

import { pathToUri } from './files';

export interface TextRange {
  start: number;
  length: number;
}

export namespace TextRange {
  export function create(start: number, length: number): TextRange {
    if (start < 0) {
      throw new Error('start must be non-negative');
    }
    if (length < 0) {
      throw new Error('length must be non-negative');
    }
    return { start, length };
  }

  export function fromBounds(start: number, end: number): TextRange {
    if (start < 0) {
      throw new Error('start must be non-negative');
    }
    if (start > end) {
      throw new Error('end must be greater than or equal to start');
    }
    return create(start, end - start);
  }

  export function getEnd(range: TextRange): number {
    return range.start + range.length;
  }

  export function contains(range: TextRange, position: number): boolean {
    return position >= range.start && position < getEnd(range);
  }

  export function extend(
    range: TextRange,
    extension: TextRange | TextRange[] | undefined
  ) {
    if (extension) {
      if (Array.isArray(extension)) {
        extension.forEach((r) => {
          extend(range, r);
        });
      } else {
        if (extension.start < range.start) {
          range.length += range.start - extension.start;
          range.start = extension.start;
        }

        if (getEnd(extension) > getEnd(range)) {
          range.length += getEnd(extension) - getEnd(range);
        }
      }
    }
  }
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface DocumentRange {
  path: string;
  range: Range;
}

export function comparePositions(a: Position, b: Position) {
  if (a.line < b.line) {
    return -1;
  } else if (a.line > b.line) {
    return 1;
  } else if (a.character < b.character) {
    return -1;
  } else if (a.character > b.character) {
    return 1;
  }
  return 0;
}

export function getEmptyPosition(): Position {
  return {
    line: 0,
    character: 0,
  };
}

export function doRangesOverlap(a: Range, b: Range) {
  if (comparePositions(b.start, a.end) >= 0) {
    return false;
  } else if (comparePositions(a.start, b.end) >= 0) {
    return false;
  }
  return true;
}

export function doesRangeContain(range: Range, position: Position) {
  return (
    comparePositions(range.start, position) <= 0 &&
    comparePositions(range.end, position) >= 0
  );
}

export function rangesAreEqual(a: Range, b: Range) {
  return comparePositions(a.start, b.start) === 0 && comparePositions(a.end, b.end) === 0;
}

export function getEmptyRange(): Range {
  return {
    start: getEmptyPosition(),
    end: getEmptyPosition(),
  };
}

export class TextRangeCollection<T extends TextRange> {
  private _items: T[];

  constructor(items: T[]) {
    this._items = items;
  }

  get start(): number {
    return this._items.length > 0 ? this._items[0].start : 0;
  }

  get end(): number {
    const lastItem = this._items[this._items.length - 1];
    return this._items.length > 0 ? lastItem.start + lastItem.length : 0;
  }

  get length(): number {
    return this.end - this.start;
  }

  get count(): number {
    return this._items.length;
  }

  contains(position: number) {
    return position >= this.start && position < this.end;
  }

  getItemAt(index: number): T {
    if (index < 0 || index >= this._items.length) {
      throw new Error('index is out of range');
    }
    return this._items[index];
  }

  getItemAtPosition(position: number): number {
    if (this.count === 0) {
      return -1;
    }
    if (position < this.start) {
      return -1;
    }
    if (position > this.end) {
      return -1;
    }

    let min = 0;
    let max = this.count - 1;

    while (min < max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this._items[mid];
      if (position >= item.start) {
        if (mid >= this.count - 1 || position < this._items[mid + 1].start) {
          return mid;
        }
      }
      if (position < item.start) {
        max = mid - 1;
      } else {
        min = mid + 1;
      }
    }
    return min;
  }

  getItemContaining(position: number): number {
    if (this.count === 0) {
      return -1;
    }
    if (position < this.start) {
      return -1;
    }
    if (position > this.end) {
      return -1;
    }

    let min = 0;
    let max = this.count - 1;

    while (min <= max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this._items[mid];

      if (TextRange.contains(item, position)) {
        return mid;
      }

      if (
        mid < this.count - 1 &&
        TextRange.getEnd(item) <= position &&
        position < this._items[mid + 1].start
      ) {
        return -1;
      }

      if (position < item.start) {
        max = mid - 1;
      } else {
        min = mid + 1;
      }
    }
    return -1;
  }
}

export interface TextEditAction {
  range: Range;
  replacementText: string;
}

export interface FileEditAction extends TextEditAction {
  filePath: string;
}

export function convertTextEdits(
  uri: string,
  editActions: TextEditAction[] | undefined
): WorkspaceEdit {
  if (!editActions) {
    return {};
  }

  const edits: TextEdit[] = [];
  editActions.forEach((editAction) => {
    edits.push({
      range: editAction.range,
      newText: editAction.replacementText,
    });
  });

  return {
    changes: {
      [uri]: edits,
    },
  };
}

export function convertWorkspaceEdits(edits: FileEditAction[]) {
  const workspaceEdits: WorkspaceEdit = {
    changes: {},
  };

  edits.forEach((edit) => {
    const uri = pathToUri(edit.filePath);
    workspaceEdits.changes![uri] = workspaceEdits.changes![uri] || [];
    workspaceEdits.changes![uri].push({
      range: edit.range,
      newText: edit.replacementText,
    });
  });

  return workspaceEdits;
}
