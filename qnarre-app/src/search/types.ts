export interface Result {
  path: string;
  title: string;
  type: string;
  titleWords: string;
  keywords: string;
  deprecated: boolean;
}

export interface Results {
  query: string;
  results: Result[];
}

export interface Area {
  name: string;
  pages: Result[];
  priority: Result[];
}
