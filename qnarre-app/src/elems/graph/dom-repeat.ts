var tf_dom_repeat;

(function(tf_dom_repeat) {
  /**
   * The TfDomRepeatBehavior re-implements part of the dom-repeat template.
   * It can be applied to any Polymer components to make it dom-repeat-like.
   * The major discrepency is in syntax when using:
   *
   *   <template is="dom-repeat">
   *     ...
   *   </template>
   *   // versus
   *   <foo-comp>
   *     <template>
   *       ...
   *     </template>
   *   </foo-comp>
   *
   * When implementing the behavior, the Polymer component has to invoke
   * `this.updateDom(newItems)`. Other protected APIs are `setGetItemKey` and
   * `setCacheSize` (please see respective doc for details).
   */
  const TfDomRepeatBehaviorImpl = {
    properties: {
      as: {
        type: String,
        value: 'item'
      },

      /**
       * Whether all stamped items are active or not.
       * @protected
       */
      _contentActive: {
        type: Boolean,
        value: true
      },

      _domBootstrapped: {
        type: Boolean,
        value: false
      },

      _ctor: {
        type: Function,
        value: () => null
      },

      /**
       * A list of rendered and mounted items.
       */
      _renderedItems: {
        type: Array,
        value: () => []
      },

      /**
       * A map of stamped child components.
       */
      _renderedTemplateInst: {
        type: Object,
        value: () => new Map()
      },

      /**
       * When item is removed, it is placed in a cache and the oldest item gets
       * removed when LRU grows more than size of the 2x_limit.
       */
      _lruCachedItems: {
        type: Object,
        value: () => new Map()
      },

      _cacheSize: {
        type: Number,
        value: 10
      },

      _getItemKey: {
        type: Function,
        value: () => item => JSON.stringify(item)
      }
    },

    observers: [
      '_bootstrapDom(_itemsRendered, isAttached)',
      '_updateDom(_renderedItems.*, _domBootstrapped)',
      '_updateActive(_contentActive)',
      '_trimCache(_cacheSize)'
    ],

    /**
     * Sets the size of the DOM cache used for optimizing performance. The
     * default cache size is 10.
     */
    setCacheSize(size) {
      this._cacheSize = size;
    },

    /**
     * Sets getItemKey, a function that requires a unique identifier for an
     * item. It is used to optimize performance of redraws. The default is
     * JSON.stringify(item).
     */
    setGetItemKey(getItemKey) {
      this._getItemKey = getItemKey;
    },

    /**
     * Updates DOM to reflect changes in `items`.
     */
    updateDom(items) {
      this.updateArrayProp('_renderedItems', items, this._getItemKey);
    },

    _ensureTemplatized() {
      // Polymer is not ready (and props/DOM for the components are not
      // populated)
      if (!this.isAttached) return false;

      if (!this._ctor) {
        const templateNode = this.querySelector('template');
        this._ctor = Polymer.Templatize.templatize(templateNode, this, {
          parentModel: true,
          instanceProps: {
            [this.as]: true,
            active: this._contentActive
          },
          forwardHostProp: function(prop, value) {
            this._renderedTemplateInst.forEach(inst => {
              inst.forwardHostProp(prop, value);
            });
          }
        });
      }
      return true;
    },

    _bootstrapDom() {
      if (
        !this._itemsRendered ||
        !this._ensureTemplatized() ||
        this._domBootstrapped
      ) {
        return;
      }
      Array.from(this.children).forEach(child => {
        Polymer.dom(this).removeChild(child);
      });
      this._lruCachedItems.clear();

      this._renderedItems.forEach((item, index) =>
        this._insertItem(item, index)
      );
      this._domBootstrapped = true;
    },

    _updateActive() {
      if (!this._domBootstrapped) return;

      Array.from(this._renderedTemplateInst.values()).forEach(inst => {
        inst.notifyPath('active', this._contentActive);
      });
    },

    _updateDom(event) {
      if (!this._domBootstrapped) return;
      // These are uninteresting.
      if (
        event.path == '_renderedItems' ||
        event.path == '_renderedItems.length'
      ) {
        return;
      }

      if (event.path === '_renderedItems.splices') {
        event.value.indexSplices.forEach(splice => {
          const {index, addedCount, object, removed} = splice;
          removed.forEach(item => {
            this._removeItem(item, this.children[index]);
          });
          object
            .slice(index, index + addedCount)
            .forEach((item, ind) => this._insertItem(item, index + ind));
          this._trimCache();
        });
      } else {
        // Update the stamped and mounted DOM model by notifying.
        const key = this._getItemKey(event.value);
        if (this._renderedTemplateInst.has(key)) {
          this._renderedTemplateInst.get(key).notifyPath(this.as, event.value);
        } else {
          console.warn(
            `Expected '${key}' to exist in the DOM but ` + `could not find one.`
          );
        }
      }
    },

    _insertItem(item, atIndex) {
      if (!this._ensureTemplatized()) {
        throw new Error('Expected templatized before inserting an item');
      }

      let fragOrEl;
      const key = this._getItemKey(item);
      if (this._lruCachedItems.has(key)) {
        fragOrEl = this._lruCachedItems.get(key);
        this._lruCachedItems.delete(key);
        this._renderedTemplateInst
          .get(key)
          .notifyPath('active', this._contentActive);
      } else {
        const prop = {[this.as]: item, active: this._contentActive};
        const inst = new this._ctor(prop);
        fragOrEl = inst.root;
        this._renderedTemplateInst.set(key, inst);
      }

      if (this.children[atIndex]) {
        Polymer.dom(this).insertBefore(fragOrEl, this.children[atIndex]);
      } else {
        const els =
          fragOrEl.nodeType == Node.DOCUMENT_FRAGMENT_NODE
            ? Array.from(fragOrEl.children)
            : [fragOrEl];
        els.forEach(node => node.setAttribute('slot', 'items'));
        Polymer.dom(this).appendChild(fragOrEl);
      }
    },

    _removeItem(item, node) {
      Polymer.dom(node.parent).removeChild(node);
      const key = this._getItemKey(item);
      this._lruCachedItems.set(key, node);
      this._renderedTemplateInst.get(key).notifyPath('active', false);
    },

    _trimCache() {
      while (this._lruCachedItems.size > this._cacheSize) {
        const [firstKey] = this._lruCachedItems.keys();
        this._lruCachedItems.delete(firstKey);
        this._renderedTemplateInst.delete(firstKey);
      }
    }
  };

  const TfDomRepeatBehavior = [
    tf_dashboard_common.ArrayUpdateHelper,
    TfDomRepeatBehaviorImpl
  ];

  tf_dom_repeat.TfDomRepeatBehavior = TfDomRepeatBehavior;
})(tf_dom_repeat || (tf_dom_repeat = {}));
