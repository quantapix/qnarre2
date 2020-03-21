import {Component, OnInit} from '@angular/core';
import * as categ_utils from './category';
import * as storage from './storage';

const LIMIT_LOCAL_STORAGE_KEY = 'TF.TensorBoard.PaginatedView.limit';
const DEFAULT_LIMIT = 12;

let _limit: number = null;

export type Listener = () => void;
const listeners = new Set<Listener>();

function addLimitListener(listener: Listener): void {
  listeners.add(listener);
}

function removeLimitListener(listener: Listener): void {
  listeners.delete(listener);
}

export function getLimit() {
  if (_limit == null) {
    _limit = storage.getNumber(LIMIT_LOCAL_STORAGE_KEY, {
      useLocalStorage: true
    });
    if (_limit == null || !isFinite(_limit) || _limit <= 0) {
      _limit = DEFAULT_LIMIT;
    }
  }
  return _limit;
}

export function setLimit(limit: number) {
  if (limit !== Math.floor(limit)) {
    throw new Error(`limit must be an integer, but got: ${limit}`);
  }
  if (limit <= 0) {
    throw new Error(`limit must be positive, but got: ${limit}`);
  }
  if (limit === _limit) {
    return;
  }
  _limit = limit;
  storage.setNumber(LIMIT_LOCAL_STORAGE_KEY, _limit, {
    useLocalStorage: true
  });
  listeners.forEach(listener => {
    listener();
  });
}

@Component({
  selector: 'qnr-category-view',
  templateUrl: './templates/category-view.component.html',
  styleUrls: ['./styles/category-view.component.scss']
})
export class CategoryViewComponent implements OnInit {
  category: categ_utils.Category<any>;
  initialOpened: boolean;
  opened: boolean; // notify, readOnly
  _contentActive: boolean; // computed: _computeContentActive(opened)
  disablePagination = false;
  _count: number; // computed: _computeCount(category.items.*)
  _hasMultiple: boolean; // computed: _computeHasMultiple(_count)
  _paneRendered: boolean; // computed: _computePaneRendered(category), observer: _onPaneRenderedChanged
  _itemsRendered: boolean; // computed: _computeItemsRendered(opened, _paneRendered)
  _isSearchResults: boolean; // computed: _computeIsSearchResults(category.metadata.type)
  _isInvalidSearchResults: boolean; // computed: _computeIsInvalidSearchResults(category.metadata)
  _isUniversalSearchQuery: boolean; // computed: _computeIsUniversalSearchQuery(category.metadata)
  getCategoryItemKey = () => (item, _) => JSON.stringify(item); // observer: _getCategoryItemKeyChanged'
  _limit = 12; // observer: _limitChanged'
  _activeIndex = 0;
  _currentPage: number; // computed: _computeCurrentPage(_limit, _activeIndex)
  _pageCount: number; // computed: _computePageCount(category.items.*, _limit)
  _multiplePagesExist: boolean; // computed: _computeMultiplePagesExist(_pageCount, disablePagination)
  _hasPreviousPage: boolean; // computed: _computeHasPreviousPage(_currentPage)
  _hasNextPage: boolean; // computed: _computeHasNextPage(_currentPage, _pageCount)
  _inputWidth: string; // computed: _computeInputWidth(_pageCount), observer: _updateInputWidth
  _pageInputRawValue = '';
  _pageInputFocused = false;

  behaviors: [tf_dom_repeat.TfDomRepeatBehavior];
  observers: [
    '_clampActiveIndex(category.items.*)',
    '_updateRenderedItems(_itemsRendered, category.items.*, _limit, _activeIndex, _pageCount, disablePagination)'
  ];

  constructor() {}

  ngOnInit() {}
  _computeCount() {
    return this.category.items.length;
  }

  _computeHasMultiple() {
    return this._count > 1;
  }

  _togglePane() {
    this._setOpened(!this.opened);
  }

  _computeContentActive() {
    return this.opened;
  }

  _onPaneRenderedChanged(newRendered, oldRendered) {
    if (newRendered && newRendered !== oldRendered) {
      this.$.ifRendered.render();
    }
  }

  _computePaneRendered(category) {
    return !(
      category.metadata.type === categ_utils.CategoryType.SEARCH_RESULTS &&
      category.name === ''
    );
  }

  _computeItemsRendered() {
    return this._paneRendered && this.opened;
  }

  _computeIsSearchResults(type) {
    return type === categ_utils.CategoryType.SEARCH_RESULTS;
  }

  _computeIsInvalidSearchResults(metadata) {
    return (
      metadata.type === categ_utils.CategoryType.SEARCH_RESULTS &&
      !metadata.validRegex
    );
  }

  _computeIsUniversalSearchQuery(metadata) {
    return (
      metadata.type === categ_utils.CategoryType.SEARCH_RESULTS &&
      metadata.universalRegex
    );
  }

  _isCompositeSearch() {
    const {type, compositeSearch} = this.category.metadata;
    return compositeSearch && type === categ_utils.CategoryType.SEARCH_RESULTS;
  }

  ready() {
    this._setOpened(this.initialOpened == null ? true : this.initialOpened);
    this._limitListener = () => {
      this.set('_limit', getLimit());
    };
    addLimitListener(this._limitListener);
    this._limitListener();
  }

  detached() {
    removeLimitListener(this._limitListener);
  }

  _updateRenderedItems(
    itemsRendered,
    _,
    limit,
    activeIndex,
    pageCount,
    disablePagination
  ) {
    if (!itemsRendered) return;
    const activePageIndex = Math.floor(activeIndex / limit);
    const items = this.category.items || [];
    const domItems = disablePagination
      ? items
      : items.slice(activePageIndex * limit, (activePageIndex + 1) * limit);
    this.updateDom(domItems, this.getCategoryItemKey);
  }

  _limitChanged(limit) {
    this.setCacheSize(limit * 2);
  }

  _getCategoryItemKeyChanged() {
    this.setGetItemKey(this.getCategoryItemKey);
  }

  _computeCurrentPage(limit, activeIndex) {
    return Math.floor(activeIndex / limit) + 1;
  }

  _computePageCount(_, limit) {
    return this.category ? Math.ceil(this.category.items.length / limit) : 0;
  }

  _computeMultiplePagesExist(pageCount, disablePagination) {
    return !disablePagination && pageCount > 1;
  }

  _computeHasPreviousPage(currentPage) {
    return currentPage > 1;
  }

  _computeHasNextPage(currentPage, pageCount) {
    return currentPage < pageCount;
  }

  _computeInputWidth(pageCount) {
    return `calc(${pageCount.toString().length}em + 20px)`;
  }

  _setActiveIndex(index) {
    const maxIndex = (this.category.items || []).length - 1;
    if (index > maxIndex) {
      index = maxIndex;
    }
    if (index < 0) {
      index = 0;
    }
    this.set('_activeIndex', index);
  }

  _clampActiveIndex(items) {
    this._setActiveIndex(this._activeIndex);
  }

  _performPreviousPage() {
    this._setActiveIndex(this._activeIndex - this._limit);
  }

  _performNextPage() {
    this._setActiveIndex(this._activeIndex + this._limit);
  }

  _computePageInputValue(focused, rawValue, currentPage) {
    return focused ? rawValue : currentPage.toString();
  }

  _handlePageInputEvent(e) {
    this.set('_pageInputRawValue', e.target.value);
    const oneIndexedPage = e.target.valueAsNumber;
    if (isNaN(oneIndexedPage)) return;
    const page = Math.max(1, Math.min(oneIndexedPage, this._pageCount)) - 1;
    this._setActiveIndex(this._limit * page);
  }

  _handlePageChangeEvent() {
    // Occurs on Enter, etc. Commit the true state.
    this.set('_pageInputRawValue', this._currentPage.toString());
  }

  _handlePageFocusEvent() {
    // Discard any old (or uninitialized) state before we grant focus.
    this.set('_pageInputRawValue', this._pageInputValue);
    this.set('_pageInputFocused', true);
  }

  _handlePageBlurEvent() {
    this.set('_pageInputFocused', false);
  }

  _updatePageInputValue(newValue) {
    const pageInput = this.$$('#page-input input');
    if (pageInput) {
      pageInput.value = newValue;
    }
  }

  _updateInputWidth() {
    this.updateStyles({
      '--qnr-category-view-page-input-width': this._inputWidth
    });
  }
}
