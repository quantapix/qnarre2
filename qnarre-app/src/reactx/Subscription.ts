import {isArray} from './util';
import {isObject} from './util';
import {isFunction} from './util';
import {UnsubscriptionError} from './util';
import {SubscriptionLike, TeardownLogic} from './types';

export class Subscription implements SubscriptionLike {
  /** @nocollapse */
  public static EMPTY: Subscription = (function (empty: any) {
    empty.closed = true;
    return empty;
  })(new Subscription());

  public closed: boolean = false;

  /** @internal */
  protected _parentOrParents: Subscription | Subscription[] | null = null;
  /** @internal */
  private _subscriptions: SubscriptionLike[] | null = null;

  constructor(unsubscribe?: () => void) {
    if (unsubscribe) {
      (<any>this)._unsubscribe = unsubscribe;
    }
  }

  unsubscribe(): void {
    let errors: any[] | undefined;

    if (this.closed) {
      return;
    }

    let {_parentOrParents, _unsubscribe, _subscriptions} = <any>this;

    this.closed = true;
    this._parentOrParents = null;
    // null out _subscriptions first so any child subscriptions that attempt
    // to remove themselves from this subscription will noop
    this._subscriptions = null;

    if (_parentOrParents instanceof Subscription) {
      _parentOrParents.remove(this);
    } else if (_parentOrParents !== null) {
      for (let index = 0; index < _parentOrParents.length; ++index) {
        const parent = _parentOrParents[index];
        parent.remove(this);
      }
    }

    if (isFunction(_unsubscribe)) {
      try {
        _unsubscribe.call(this);
      } catch (e) {
        errors =
          e instanceof UnsubscriptionError
            ? flattenUnsubscriptionErrors(e.errors)
            : [e];
      }
    }

    if (isArray(_subscriptions)) {
      let index = -1;
      let len = _subscriptions.length;

      while (++index < len) {
        const sub = _subscriptions[index];
        if (isObject(sub)) {
          try {
            sub.unsubscribe();
          } catch (e) {
            errors = errors || [];
            if (e instanceof UnsubscriptionError) {
              errors = errors.concat(flattenUnsubscriptionErrors(e.errors));
            } else {
              errors.push(e);
            }
          }
        }
      }
    }

    if (errors) {
      throw new UnsubscriptionError(errors);
    }
  }

  add(teardown: TeardownLogic): Subscription {
    let subscription = <Subscription>teardown;

    if (!(<any>teardown)) {
      return Subscription.EMPTY;
    }

    switch (typeof teardown) {
      case 'function':
        subscription = new Subscription(<() => void>teardown);
      case 'object':
        if (
          subscription === this ||
          subscription.closed ||
          typeof subscription.unsubscribe !== 'function'
        ) {
          // This also covers the case where `subscription` is `Subscription.EMPTY`, which is always in `closed` state.
          return subscription;
        } else if (this.closed) {
          subscription.unsubscribe();
          return subscription;
        } else if (!(subscription instanceof Subscription)) {
          const tmp = subscription;
          subscription = new Subscription();
          subscription._subscriptions = [tmp];
        }
        break;
      default: {
        throw new Error(
          'unrecognized teardown ' + teardown + ' added to Subscription.'
        );
      }
    }

    // Add `this` as parent of `subscription` if that's not already the case.
    let {_parentOrParents} = subscription;
    if (_parentOrParents === null) {
      // If we don't have a parent, then set `subscription._parents` to
      // the `this`, which is the common case that we optimize for.
      subscription._parentOrParents = this;
    } else if (_parentOrParents instanceof Subscription) {
      if (_parentOrParents === this) {
        // The `subscription` already has `this` as a parent.
        return subscription;
      }
      // If there's already one parent, but not multiple, allocate an
      // Array to store the rest of the parent Subscriptions.
      subscription._parentOrParents = [_parentOrParents, this];
    } else if (_parentOrParents.indexOf(this) === -1) {
      // Only add `this` to the _parentOrParents list if it's not already there.
      _parentOrParents.push(this);
    } else {
      // The `subscription` already has `this` as a parent.
      return subscription;
    }

    // Optimize for the common case when adding the first subscription.
    const subscriptions = this._subscriptions;
    if (subscriptions === null) {
      this._subscriptions = [subscription];
    } else {
      subscriptions.push(subscription);
    }

    return subscription;
  }

  remove(subscription: Subscription): void {
    const subscriptions = this._subscriptions;
    if (subscriptions) {
      const subscriptionIndex = subscriptions.indexOf(subscription);
      if (subscriptionIndex !== -1) {
        subscriptions.splice(subscriptionIndex, 1);
      }
    }
  }
}

function flattenUnsubscriptionErrors(errors: any[]) {
  return errors.reduce(
    (errs, err) =>
      errs.concat(err instanceof UnsubscriptionError ? err.errors : err),
    []
  );
}
