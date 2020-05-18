import { DocumentContext } from 'vscode-css-languageservice';
import { endsWith, startsWith } from './strings';
import * as url from 'url';
import { WorkspaceFolder } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

function getModuleNameFromPath(path: string) {
  if (path.startsWith('@')) {
    return path.substring(0, path.indexOf('/', path.indexOf('/') + 1));
  }
  return path.substring(0, path.indexOf('/'));
}

function resolvePathToModule(
  _moduleName: string,
  _relativeToFolder: string,
  _rootFolder: string | undefined
): string | undefined {
  // resolve the module relative to the document. We can't use `require` here as the code is webpacked.

  const packPath = join(_relativeToFolder, 'node_modules', _moduleName, 'package.json');
  if (existsSync(packPath)) {
    return URI.file(packPath).toString();
  } else if (
    _rootFolder &&
    _relativeToFolder.startsWith(_rootFolder) &&
    _relativeToFolder.length !== _rootFolder.length
  ) {
    return resolvePathToModule(_moduleName, dirname(_relativeToFolder), _rootFolder);
  }
  return undefined;
}

export function getDocumentContext(
  documentUri: string,
  workspaceFolders: WorkspaceFolder[]
): DocumentContext {
  function getRootFolder(): string | undefined {
    for (const folder of workspaceFolders) {
      let folderURI = folder.uri;
      if (!endsWith(folderURI, '/')) {
        folderURI = folderURI + '/';
      }
      if (startsWith(documentUri, folderURI)) {
        return folderURI;
      }
    }
    return undefined;
  }
  return {
    resolveReference: (ref, base = documentUri) => {
      if (ref.startsWith('/')) {
        if (startsWith(base, 'file://')) {
          const folderUri = getRootFolder();
          if (folderUri) {
            return folderUri + ref.substr(1);
          }
        }
      }
      if (ref.startsWith('~') && ref[1] !== '/') {
        ref = ref.substring(1);
        if (startsWith(base, 'file://')) {
          const moduleName = getModuleNameFromPath(ref);
          const rootFolderUri = getRootFolder();
          let rootFolder;
          if (rootFolderUri) {
            rootFolder = URI.parse(rootFolderUri).fsPath;
          }
          const documentFolder = dirname(URI.parse(base).fsPath);
          const modulePath = resolvePathToModule(moduleName, documentFolder, rootFolder);
          if (modulePath) {
            const pathWithinModule = ref.substring(moduleName.length + 1);
            return url.resolve(modulePath, pathWithinModule);
          }
        }
      }
      try {
        return url.resolve(base, ref);
      } catch {
        return '';
      }
    },
  };
}
