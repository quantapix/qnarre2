export interface NavNode {
  title: string;
  url?: string;
  tooltip?: string;
  hidden?: boolean;
  children?: NavNode[];
}

export type NavResponse = {__versionInfo: VersionInfo} & {
  [name: string]: NavNode[] | VersionInfo;
};

export interface NavViews {
  [name: string]: NavNode[];
}

export interface CurrentNode {
  url: string;
  view: string;
  nodes: NavNode[];
}

export interface CurrentNodes {
  [view: string]: CurrentNode;
}

export interface VersionInfo {
  raw: string;
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  build: string;
  version: string;
  codeName: string;
  isSnapshot: boolean;
  full: string;
  branch: string;
  commitSHA: string;
}
