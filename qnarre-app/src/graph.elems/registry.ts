export enum ActiveDashboardsLoadState {
  NOT_LOADED = 'NOT_LOADED',
  LOADED = 'LOADED',
  FAILED = 'FAILED'
}

export interface Dashboard {
  elementName: string;
  plugin: string;
  tabName: string;
  isReloadDisabled: boolean;
  shouldRemoveDom: boolean;
}

export type DashboardRegistry = {[key: string]: Dashboard};
export const dashboardRegistry: DashboardRegistry = {};

export function registerDashboard(dashboard: Dashboard) {
  if (!dashboard.plugin) {
    throw new Error('Dashboard.plugin must be present');
  }
  if (!dashboard.elementName) {
    throw new Error('Dashboard.elementName must be present');
  }
  if (dashboard.plugin in dashboardRegistry) {
    throw new Error(`Plugin already registered: ${dashboard.plugin}`);
  }
  if (!dashboard.tabName) {
    dashboard.tabName = dashboard.plugin;
  }
  dashboardRegistry[dashboard.plugin] = dashboard;
}
