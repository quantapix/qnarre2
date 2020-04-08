import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {MatSidenav} from '@angular/material/sidenav';

import {
  CurrentNodes,
  NavigationService,
  NavigationNode,
  VersionInfo
} from 'app/navigation/navigation.service';
import {
  DocumentService,
  DocumentContents
} from 'app/documents/document.service';
import {Deployment} from 'app/shared/deployment.service';
import {LocService} from 'app/shared/location.service';
import {NotificationComponent} from 'app/layout/notification/notification.component';
import {ScrollService} from 'app/shared/scroll.service';
import {SearchBoxComponent} from 'app/search/search-box/search-box.component';
import {SearchResults} from 'app/search/interfaces';
import {SearchService} from 'app/search/search.service';
import {TocService} from 'app/shared/toc.service';

import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {first, map} from 'rxjs/operators';

const sideNavView = 'SideNav';

@Component({
  selector: 'qnr-docs-app',
  templateUrl: './component.html'
})
export class DocsAppComp implements OnInit {
  currentDocument: DocumentContents;
  currentDocVersion: NavigationNode;
  currentNodes: CurrentNodes = {};
  currentPath: string;
  docVersions: NavigationNode[];
  dtOn = false;
  footerNodes: NavigationNode[];
  pageId: string;
  folderId: string;
  @HostBinding('class')
  hostClasses = '';
  @HostBinding('@.disabled')
  isStarting = true;
  isTransitioning = true;
  isFetching = false;
  isSideBySide = false;
  private isFetchingTimeout: any;
  private isSideNavDoc = false;

  private sideBySideWidth = 992;
  sideNavNodes: NavigationNode[];
  topMenuNodes: NavigationNode[];
  topMenuNarrowNodes: NavigationNode[];

  hasFloatingToc = false;
  private showFloatingToc = new BehaviorSubject(false);
  private showFloatingTocWidth = 800;
  tocMaxHeight: string;
  private tocMaxHeightOffset = 0;

  versionInfo: VersionInfo;

  get isOpened() {
    return this.isSideBySide && this.isSideNavDoc;
  }
  get mode() {
    return this.isSideBySide ? 'side' : 'over';
  }
  showSearchResults = false;
  searchResults: Observable<SearchResults>;
  @ViewChildren('searchBox, searchResultsView', {read: ElementRef})
  searchElements: QueryList<ElementRef>;
  @ViewChild(SearchBoxComponent, {static: true})
  searchBox: SearchBoxComponent;

  @ViewChild(MatSidenav, {static: true})
  sidenav: MatSidenav;

  @ViewChild(NotificationComponent, {static: true})
  notification: NotificationComponent;
  notificationAnimating = false;

  constructor(
    public deployment: Deployment,
    private documentService: DocumentService,
    private hostElement: ElementRef,
    private locationService: LocService,
    private navigationService: NavigationService,
    private scrollService: ScrollService,
    private searchService: SearchService,
    private tocService: TocService
  ) {}

  ngOnInit() {
    if ('Worker' in window) {
      this.searchService.initWorker(2000);
    }
    this.onResize(window.innerWidth);
    this.documentService.currentDocument.subscribe(
      doc => (this.currentDocument = doc)
    );
    this.locationService.currentPath.subscribe(path => {
      if (path === this.currentPath) {
        this.scrollService.scroll();
      } else {
        this.currentPath = path;
        clearTimeout(this.isFetchingTimeout);
        this.isFetchingTimeout = setTimeout(
          () => (this.isFetching = true),
          200
        );
      }
    });
    this.navigationService.currentNodes.subscribe(currentNodes => {
      this.currentNodes = currentNodes;
      if (this.deployment.mode === 'archive' && !currentNodes[sideNavView]) {
        this.locationService.replace('docs');
      }
    });
    combineLatest([
      this.navigationService.versionInfo,
      this.navigationService.navigationViews.pipe(
        map(views => views['docVersions'])
      )
    ]).subscribe(([versionInfo, versions]) => {
      const computedVersions: NavigationNode[] = [
        {title: 'next', url: 'https://quantapix.github.io/qnarre-dev'},
        {title: 'stable', url: 'https://quantapix.github.io/qnarre-dev'}
      ];
      if (this.deployment.mode === 'archive') {
        computedVersions.push({title: `v${versionInfo.major}`});
      }
      this.docVersions = [...computedVersions, ...versions];
      this.currentDocVersion = this.docVersions.find(
        version =>
          version.title === this.deployment.mode ||
          version.title === `v${versionInfo.major}`
      )!;
      this.currentDocVersion.title += ` (v${versionInfo.raw})`;
    });
    this.navigationService.navigationViews.subscribe(views => {
      this.footerNodes = views['Footer'] || [];
      this.sideNavNodes = views['SideNav'] || [];
      this.topMenuNodes = views['TopBar'] || [];
      this.topMenuNarrowNodes = views['TopBarNarrow'] || this.topMenuNodes;
    });
    this.navigationService.versionInfo.subscribe(vi => (this.versionInfo = vi));
    const hasNonEmptyToc = this.tocService.items.pipe(
      map(items => items.length > 0)
    );
    combineLatest([hasNonEmptyToc, this.showFloatingToc]).subscribe(
      ([hasToc, showFloatingToc]) =>
        (this.hasFloatingToc = hasToc && showFloatingToc)
    );
    combineLatest([
      this.documentService.currentDocument,
      this.navigationService.currentNodes
    ])
      .pipe(first())
      .subscribe(() => this.updateShell());
  }

  onDocReady() {
    this.isTransitioning = true;
    clearTimeout(this.isFetchingTimeout);
    setTimeout(() => (this.isFetching = false), 500);
  }

  onDocRemoved() {
    this.scrollService.removeStoredScrollInfo();
  }

  onDocInserted() {
    setTimeout(() => this.updateShell());
    this.scrollService.scrollAfterRender(500);
  }

  onDocRendered() {
    if (this.isStarting) {
      setTimeout(() => (this.isStarting = false), 100);
    }
    this.isTransitioning = false;
  }

  onDocVersionChange(versionIndex: number) {
    const version = this.docVersions[versionIndex];
    if (version.url) {
      this.locationService.go(version.url);
    }
  }

  @HostListener('window:resize', ['$event.target.innerWidth'])
  onResize(width: number) {
    this.isSideBySide = width >= this.sideBySideWidth;
    this.showFloatingToc.next(width > this.showFloatingTocWidth);
    if (this.isSideBySide && !this.isSideNavDoc) {
      this.sidenav.toggle(false);
    }
  }

  @HostListener('click', [
    '$event.target',
    '$event.button',
    '$event.ctrlKey',
    '$event.metaKey',
    '$event.altKey'
  ])
  onClick(
    eventTarget: HTMLElement,
    button: number,
    ctrlKey: boolean,
    metaKey: boolean,
    altKey: boolean
  ): boolean {
    if (
      !this.searchElements.some(element =>
        element.nativeElement.contains(eventTarget)
      )
    ) {
      this.hideSearchResults();
    }
    if (eventTarget.tagName === 'FOOTER' && metaKey && altKey) {
      this.dtOn = !this.dtOn;
      return false;
    }
    let target: HTMLElement | null = eventTarget;
    while (target && !(target instanceof HTMLAnchorElement)) {
      target = target.parentElement;
    }
    if (target instanceof HTMLAnchorElement) {
      return this.locationService.handleAnchorClick(
        target,
        button,
        ctrlKey,
        metaKey
      );
    }
    return true;
  }

  setPageId(id: string) {
    this.pageId = id === 'index' ? 'home' : id.replace('/', '-');
  }

  setFolderId(id: string) {
    this.folderId = id === 'index' ? 'home' : id.split('/', 1)[0];
  }

  notificationDismissed() {
    this.notificationAnimating = true;
    setTimeout(() => (this.notificationAnimating = false), 250);
    this.updateHostClasses();
  }

  updateHostClasses() {
    const mode = `mode-${this.deployment.mode}`;
    const sideNavOpen = `sidenav-${this.sidenav.opened ? 'open' : 'closed'}`;
    const pageClass = `page-${this.pageId}`;
    const folderClass = `folder-${this.folderId}`;
    const viewClasses = Object.keys(this.currentNodes)
      .map(view => `view-${view}`)
      .join(' ');
    const notificationClass = `qnr-notification-${this.notification.showNotification}`;
    const notificationAnimatingClass = this.notificationAnimating
      ? 'qnr-notification-animating'
      : '';

    this.hostClasses = [
      mode,
      sideNavOpen,
      pageClass,
      folderClass,
      viewClasses,
      notificationClass,
      notificationAnimatingClass
    ].join(' ');
  }

  updateShell() {
    this.updateSideNav();
    this.setPageId(this.currentDocument.id);
    this.setFolderId(this.currentDocument.id);
    this.updateHostClasses();
  }

  updateSideNav() {
    let openSideNav = this.sidenav.opened;
    const isSideNavDoc = !!this.currentNodes[sideNavView];
    if (this.isSideNavDoc !== isSideNavDoc) {
      openSideNav = this.isSideNavDoc = isSideNavDoc;
    }
    this.sidenav.toggle(this.isSideBySide && openSideNav);
  }

  @HostListener('window:scroll')
  onScroll() {
    if (!this.tocMaxHeightOffset) {
      const el = this.hostElement.nativeElement as Element;
      const headerEl = el.querySelector('.app-toolbar');
      const footerEl = el.querySelector('footer');
      if (headerEl && footerEl) {
        this.tocMaxHeightOffset =
          headerEl.clientHeight + footerEl.clientHeight + 24; //  fudge margin
      }
    }
    this.tocMaxHeight = (
      document.body.scrollHeight -
      window.pageYOffset -
      this.tocMaxHeightOffset
    ).toFixed(2);
  }

  restrainScrolling(evt: WheelEvent) {
    const elem = evt.currentTarget as Element;
    const scrollTop = elem.scrollTop;

    if (evt.deltaY < 0) {
      if (scrollTop < 1) {
        evt.preventDefault();
      }
    } else {
      const maxScrollTop = elem.scrollHeight - elem.clientHeight;
      if (maxScrollTop - scrollTop < 1) {
        evt.preventDefault();
      }
    }
  }

  hideSearchResults() {
    this.showSearchResults = false;
    const oldSearch = this.locationService.search();
    if (oldSearch.search !== undefined) {
      this.locationService.setSearch('', {...oldSearch, search: undefined});
    }
  }

  focusSearchBox() {
    if (this.searchBox) {
      this.searchBox.focus();
    }
  }

  doSearch(query: string) {
    this.searchResults = this.searchService.search(query);
    this.showSearchResults = !!query;
  }

  @HostListener('document:keyup', ['$event.key', '$event.which'])
  onKeyUp(key: string, keyCode: number) {
    if (key === '/' || keyCode === 191) {
      this.focusSearchBox();
    }
    if (key === 'Escape' || keyCode === 27) {
      if (this.showSearchResults) {
        this.hideSearchResults();
        this.focusSearchBox();
      }
    }
  }
}
