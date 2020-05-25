"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.padRight = exports.padLeft = exports.cartesianProduct = exports.fill = exports.enumerateInsertsAndDeletes = exports.singleElementArray = exports.assertType = exports.not = exports.or = exports.and = exports.tryRemovePrefix = exports.removePrefix = exports.startsWith = exports.findBestPatternMatch = exports.matchedText = exports.patternText = exports.createGetCanonicalFileName = exports.unorderedRemoveItem = exports.unorderedRemoveItemAt = exports.orderedRemoveItemAt = exports.orderedRemoveItem = exports.removeMinAndVersionNumbers = exports.stringContains = exports.tryRemoveSuffix = exports.removeSuffix = exports.endsWith = exports.getSpellingSuggestion = exports.compareBooleans = exports.compareProperties = exports.compareStringsCaseSensitiveUI = exports.setUILocale = exports.getUILocale = exports.getStringComparer = exports.compareStringsCaseSensitive = exports.compareStringsCaseInsensitive = exports.min = exports.compareTextSpans = exports.compareValues = exports.equateStringsCaseSensitive = exports.equateStringsCaseInsensitive = exports.equateValues = exports.compose = exports.memoize = exports.notImplemented = exports.toFileNameLowerCase = exports.toLowerCase = exports.identity = exports.returnUndefined = exports.returnTrue = exports.returnFalse = exports.noop = exports.cast = exports.tryCast = exports.isNumber = exports.isString = exports.toArray = exports.isArray = exports.createUnderscoreEscapedMultiMap = exports.createMultiMap = exports.mapMap = exports.maybeBind = exports.copyProperties = exports.extend = exports.clone = exports.group = exports.arrayToMultiMap = exports.arrayToNumericMap = exports.arrayToMap = exports.equalOwnProperties = exports.assign = exports.arrayFrom = exports.getOwnValues = exports.getAllKeys = exports.getOwnKeys = exports.getProperty = exports.hasProperty = exports.reduceLeft = exports.binarySearchKey = exports.binarySearch = exports.replaceElement = exports.singleOrMany = exports.singleOrUndefined = exports.last = exports.lastOrUndefined = exports.first = exports.firstOrUndefined = exports.elementAt = exports.rangeEquals = exports.stableSort = exports.arrayReverseIterator = exports.arrayIterator = exports.sort = exports.appendIfUnique = exports.pushIfUnique = exports.addRange = exports.combine = exports.append = exports.sum = exports.relativeComplement = exports.compact = exports.arrayIsEqualTo = exports.sortAndDeduplicate = exports.insertSorted = exports.deduplicate = exports.indicesOf = exports.concatenate = exports.getRangesWhere = exports.some = exports.mapEntries = exports.spanMap = exports.singleIterator = exports.emptyIterator = exports.mapDefinedMap = exports.mapDefinedIterator = exports.mapDefined = exports.mapAllOrFail = exports.sameFlatMap = exports.flatMapIterator = exports.flatMapToMutable = exports.flatMap = exports.flatten = exports.sameMap = exports.mapIterator = exports.map = exports.clear = exports.filterMutate = exports.filter = exports.countWhere = exports.indexOfAnyCharCode = exports.arraysEqual = exports.contains = exports.findMap = exports.findLastIndex = exports.findIndex = exports.findLast = exports.find = exports.every = exports.intersperse = exports.zipToMap = exports.zipToIterator = exports.zipWith = exports.firstDefinedIterator = exports.firstDefined = exports.forEachRight = exports.forEach = exports.length = exports.createMapFromTemplate = exports.createMapFromEntries = exports.createMap = exports.emptyArray = void 0;
exports.emptyArray = [];
/** Create a new map. */
function createMap() {
    return new Map();
}
exports.createMap = createMap;
/** Create a new map from an array of entries. */
function createMapFromEntries(entries) {
    var map = createMap();
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var _a = entries_1[_i], key = _a[0], value = _a[1];
        map.set(key, value);
    }
    return map;
}
exports.createMapFromEntries = createMapFromEntries;
/** Create a new map from a template object is provided, the map will copy entries from it. */
function createMapFromTemplate(template) {
    var map = new Map();
    // Copies keys/values from template. Note that for..in will not throw if
    // template is undefined, and instead will just exit the loop.
    for (var key in template) {
        if (hasOwnProperty.call(template, key)) {
            map.set(key, template[key]);
        }
    }
    return map;
}
exports.createMapFromTemplate = createMapFromTemplate;
function length(array) {
    return array ? array.length : 0;
}
exports.length = length;
/**
 * Iterates through 'array' by index and performs the callback on each element of array until the callback
 * returns a truthy value, then returns that value.
 * If no such value is found, the callback is applied to each element of array and undefined is returned.
 */
function forEach(array, callback) {
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var result = callback(array[i], i);
            if (result) {
                return result;
            }
        }
    }
    return undefined;
}
exports.forEach = forEach;
/**
 * Like `forEach`, but iterates in reverse order.
 */
function forEachRight(array, callback) {
    if (array) {
        for (var i = array.length - 1; i >= 0; i--) {
            var result = callback(array[i], i);
            if (result) {
                return result;
            }
        }
    }
    return undefined;
}
exports.forEachRight = forEachRight;
/** Like `forEach`, but suitable for use with numbers and strings (which may be falsy). */
function firstDefined(array, callback) {
    if (array === undefined) {
        return undefined;
    }
    for (var i = 0; i < array.length; i++) {
        var result = callback(array[i], i);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}
exports.firstDefined = firstDefined;
function firstDefinedIterator(iter, callback) {
    while (true) {
        var iterResult = iter.next();
        if (iterResult.done) {
            return undefined;
        }
        var result = callback(iterResult.value);
        if (result !== undefined) {
            return result;
        }
    }
}
exports.firstDefinedIterator = firstDefinedIterator;
function zipWith(arrayA, arrayB, callback) {
    var result = [];
    Debug.assertEqual(arrayA.length, arrayB.length);
    for (var i = 0; i < arrayA.length; i++) {
        result.push(callback(arrayA[i], arrayB[i], i));
    }
    return result;
}
exports.zipWith = zipWith;
function zipToIterator(arrayA, arrayB) {
    Debug.assertEqual(arrayA.length, arrayB.length);
    var i = 0;
    return {
        next: function () {
            if (i === arrayA.length) {
                return { value: undefined, done: true };
            }
            i++;
            return { value: [arrayA[i - 1], arrayB[i - 1]], done: false };
        }
    };
}
exports.zipToIterator = zipToIterator;
function zipToMap(keys, values) {
    Debug.assert(keys.length === values.length);
    var map = createMap();
    for (var i = 0; i < keys.length; ++i) {
        map.set(keys[i], values[i]);
    }
    return map;
}
exports.zipToMap = zipToMap;
/**
 * Creates a new array with `element` interspersed in between each element of `input`
 * if there is more than 1 value in `input`. Otherwise, returns the existing array.
 */
function intersperse(input, element) {
    if (input.length <= 1) {
        return input;
    }
    var result = [];
    for (var i = 0, n = input.length; i < n; i++) {
        if (i)
            result.push(element);
        result.push(input[i]);
    }
    return result;
}
exports.intersperse = intersperse;
/**
 * Iterates through `array` by index and performs the callback on each element of array until the callback
 * returns a falsey value, then returns false.
 * If no such value is found, the callback is applied to each element of array and `true` is returned.
 */
function every(array, callback) {
    if (array) {
        for (var i = 0; i < array.length; i++) {
            if (!callback(array[i], i)) {
                return false;
            }
        }
    }
    return true;
}
exports.every = every;
function find(array, predicate) {
    for (var i = 0; i < array.length; i++) {
        var value = array[i];
        if (predicate(value, i)) {
            return value;
        }
    }
    return undefined;
}
exports.find = find;
function findLast(array, predicate) {
    for (var i = array.length - 1; i >= 0; i--) {
        var value = array[i];
        if (predicate(value, i)) {
            return value;
        }
    }
    return undefined;
}
exports.findLast = findLast;
/** Works like Array.prototype.findIndex, returning `-1` if no element satisfying the predicate is found. */
function findIndex(array, predicate, startIndex) {
    for (var i = startIndex || 0; i < array.length; i++) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}
exports.findIndex = findIndex;
function findLastIndex(array, predicate, startIndex) {
    for (var i = startIndex === undefined ? array.length - 1 : startIndex; i >= 0; i--) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}
exports.findLastIndex = findLastIndex;
/**
 * Returns the first truthy result of `callback`, or else fails.
 * This is like `forEach`, but never returns undefined.
 */
function findMap(array, callback) {
    for (var i = 0; i < array.length; i++) {
        var result = callback(array[i], i);
        if (result) {
            return result;
        }
    }
    return Debug.fail();
}
exports.findMap = findMap;
function contains(array, value, equalityComparer) {
    if (equalityComparer === void 0) { equalityComparer = equateValues; }
    if (array) {
        for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
            var v = array_1[_i];
            if (equalityComparer(v, value)) {
                return true;
            }
        }
    }
    return false;
}
exports.contains = contains;
function arraysEqual(a, b, equalityComparer) {
    if (equalityComparer === void 0) { equalityComparer = equateValues; }
    return a.length === b.length && a.every(function (x, i) { return equalityComparer(x, b[i]); });
}
exports.arraysEqual = arraysEqual;
function indexOfAnyCharCode(text, charCodes, start) {
    for (var i = start || 0; i < text.length; i++) {
        if (contains(charCodes, text.charCodeAt(i))) {
            return i;
        }
    }
    return -1;
}
exports.indexOfAnyCharCode = indexOfAnyCharCode;
function countWhere(array, predicate) {
    var count = 0;
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var v = array[i];
            if (predicate(v, i)) {
                count++;
            }
        }
    }
    return count;
}
exports.countWhere = countWhere;
function filter(array, f) {
    if (array) {
        var len = array.length;
        var i = 0;
        while (i < len && f(array[i]))
            i++;
        if (i < len) {
            var result = array.slice(0, i);
            i++;
            while (i < len) {
                var item = array[i];
                if (f(item)) {
                    result.push(item);
                }
                i++;
            }
            return result;
        }
    }
    return array;
}
exports.filter = filter;
function filterMutate(array, f) {
    var outIndex = 0;
    for (var i = 0; i < array.length; i++) {
        if (f(array[i], i, array)) {
            array[outIndex] = array[i];
            outIndex++;
        }
    }
    array.length = outIndex;
}
exports.filterMutate = filterMutate;
function clear(array) {
    array.length = 0;
}
exports.clear = clear;
function map(array, f) {
    var result;
    if (array) {
        result = [];
        for (var i = 0; i < array.length; i++) {
            result.push(f(array[i], i));
        }
    }
    return result;
}
exports.map = map;
function mapIterator(iter, mapFn) {
    return {
        next: function () {
            var iterRes = iter.next();
            return iterRes.done ? iterRes : { value: mapFn(iterRes.value), done: false };
        }
    };
}
exports.mapIterator = mapIterator;
function sameMap(array, f) {
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            var mapped = f(item, i);
            if (item !== mapped) {
                var result = array.slice(0, i);
                result.push(mapped);
                for (i++; i < array.length; i++) {
                    result.push(f(array[i], i));
                }
                return result;
            }
        }
    }
    return array;
}
exports.sameMap = sameMap;
/**
 * Flattens an array containing a mix of array or non-array elements.
 *
 * @param array The array to flatten.
 */
function flatten(array) {
    var result = [];
    for (var _i = 0, array_2 = array; _i < array_2.length; _i++) {
        var v = array_2[_i];
        if (v) {
            if (isArray(v)) {
                addRange(result, v);
            }
            else {
                result.push(v);
            }
        }
    }
    return result;
}
exports.flatten = flatten;
/**
 * Maps an array. If the mapped value is an array, it is spread into the result.
 *
 * @param array The array to map.
 * @param mapfn The callback used to map the result into one or more values.
 */
function flatMap(array, mapfn) {
    var result;
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var v = mapfn(array[i], i);
            if (v) {
                if (isArray(v)) {
                    result = addRange(result, v);
                }
                else {
                    result = append(result, v);
                }
            }
        }
    }
    return result || exports.emptyArray;
}
exports.flatMap = flatMap;
function flatMapToMutable(array, mapfn) {
    var result = [];
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var v = mapfn(array[i], i);
            if (v) {
                if (isArray(v)) {
                    addRange(result, v);
                }
                else {
                    result.push(v);
                }
            }
        }
    }
    return result;
}
exports.flatMapToMutable = flatMapToMutable;
function flatMapIterator(iter, mapfn) {
    var first = iter.next();
    if (first.done) {
        return exports.emptyIterator;
    }
    var currentIter = getIterator(first.value);
    return {
        next: function () {
            while (true) {
                var currentRes = currentIter.next();
                if (!currentRes.done) {
                    return currentRes;
                }
                var iterRes = iter.next();
                if (iterRes.done) {
                    return iterRes;
                }
                currentIter = getIterator(iterRes.value);
            }
        }
    };
    function getIterator(x) {
        var res = mapfn(x);
        return res === undefined ? exports.emptyIterator : isArray(res) ? arrayIterator(res) : res;
    }
}
exports.flatMapIterator = flatMapIterator;
function sameFlatMap(array, mapfn) {
    var result;
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            var mapped = mapfn(item, i);
            if (result || item !== mapped || isArray(mapped)) {
                if (!result) {
                    result = array.slice(0, i);
                }
                if (isArray(mapped)) {
                    addRange(result, mapped);
                }
                else {
                    result.push(mapped);
                }
            }
        }
    }
    return result || array;
}
exports.sameFlatMap = sameFlatMap;
function mapAllOrFail(array, mapFn) {
    var result = [];
    for (var i = 0; i < array.length; i++) {
        var mapped = mapFn(array[i], i);
        if (mapped === undefined) {
            return undefined;
        }
        result.push(mapped);
    }
    return result;
}
exports.mapAllOrFail = mapAllOrFail;
function mapDefined(array, mapFn) {
    var result = [];
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var mapped = mapFn(array[i], i);
            if (mapped !== undefined) {
                result.push(mapped);
            }
        }
    }
    return result;
}
exports.mapDefined = mapDefined;
function mapDefinedIterator(iter, mapFn) {
    return {
        next: function () {
            while (true) {
                var res = iter.next();
                if (res.done) {
                    return res;
                }
                var value = mapFn(res.value);
                if (value !== undefined) {
                    return { value: value, done: false };
                }
            }
        }
    };
}
exports.mapDefinedIterator = mapDefinedIterator;
function mapDefinedMap(map, mapValue, mapKey) {
    if (mapKey === void 0) { mapKey = identity; }
    var result = createMap();
    map.forEach(function (value, key) {
        var mapped = mapValue(value, key);
        if (mapped !== undefined) {
            result.set(mapKey(key), mapped);
        }
    });
    return result;
}
exports.mapDefinedMap = mapDefinedMap;
exports.emptyIterator = { next: function () { return ({ value: undefined, done: true }); } };
function singleIterator(value) {
    var done = false;
    return {
        next: function () {
            var wasDone = done;
            done = true;
            return wasDone ? { value: undefined, done: true } : { value: value, done: false };
        }
    };
}
exports.singleIterator = singleIterator;
function spanMap(array, keyfn, mapfn) {
    var result;
    if (array) {
        result = [];
        var len = array.length;
        var previousKey = void 0;
        var key = void 0;
        var start = 0;
        var pos = 0;
        while (start < len) {
            while (pos < len) {
                var value = array[pos];
                key = keyfn(value, pos);
                if (pos === 0) {
                    previousKey = key;
                }
                else if (key !== previousKey) {
                    break;
                }
                pos++;
            }
            if (start < pos) {
                var v = mapfn(array.slice(start, pos), previousKey, start, pos);
                if (v) {
                    result.push(v);
                }
                start = pos;
            }
            previousKey = key;
            pos++;
        }
    }
    return result;
}
exports.spanMap = spanMap;
function mapEntries(map, f) {
    if (!map) {
        return undefined;
    }
    var result = createMap();
    map.forEach(function (value, key) {
        var _a = f(key, value), newKey = _a[0], newValue = _a[1];
        result.set(newKey, newValue);
    });
    return result;
}
exports.mapEntries = mapEntries;
function some(array, predicate) {
    if (array) {
        if (predicate) {
            for (var _i = 0, array_3 = array; _i < array_3.length; _i++) {
                var v = array_3[_i];
                if (predicate(v)) {
                    return true;
                }
            }
        }
        else {
            return array.length > 0;
        }
    }
    return false;
}
exports.some = some;
/** Calls the callback with (start, afterEnd) index pairs for each range where 'pred' is true. */
function getRangesWhere(arr, pred, cb) {
    var start;
    for (var i = 0; i < arr.length; i++) {
        if (pred(arr[i])) {
            start = start === undefined ? i : start;
        }
        else {
            if (start !== undefined) {
                cb(start, i);
                start = undefined;
            }
        }
    }
    if (start !== undefined)
        cb(start, arr.length);
}
exports.getRangesWhere = getRangesWhere;
function concatenate(array1, array2) {
    if (!some(array2))
        return array1;
    if (!some(array1))
        return array2;
    return __spreadArrays(array1, array2);
}
exports.concatenate = concatenate;
function selectIndex(_, i) {
    return i;
}
function indicesOf(array) {
    return array.map(selectIndex);
}
exports.indicesOf = indicesOf;
function deduplicateRelational(array, equalityComparer, comparer) {
    // Perform a stable sort of the array. This ensures the first entry in a list of
    // duplicates remains the first entry in the result.
    var indices = indicesOf(array);
    stableSortIndices(array, indices, comparer);
    var last = array[indices[0]];
    var deduplicated = [indices[0]];
    for (var i = 1; i < indices.length; i++) {
        var index = indices[i];
        var item = array[index];
        if (!equalityComparer(last, item)) {
            deduplicated.push(index);
            last = item;
        }
    }
    // restore original order
    deduplicated.sort();
    return deduplicated.map(function (i) { return array[i]; });
}
function deduplicateEquality(array, equalityComparer) {
    var result = [];
    for (var _i = 0, array_4 = array; _i < array_4.length; _i++) {
        var item = array_4[_i];
        pushIfUnique(result, item, equalityComparer);
    }
    return result;
}
/**
 * Deduplicates an unsorted array.
 * @param equalityComparer An `EqualityComparer` used to determine if two values are duplicates.
 * @param comparer An optional `Comparer` used to sort entries before comparison, though the
 * result will remain in the original order in `array`.
 */
function deduplicate(array, equalityComparer, comparer) {
    return array.length === 0 ? [] : array.length === 1 ? array.slice() : comparer ? deduplicateRelational(array, equalityComparer, comparer) : deduplicateEquality(array, equalityComparer);
}
exports.deduplicate = deduplicate;
/**
 * Deduplicates an array that has already been sorted.
 */
function deduplicateSorted(array, comparer) {
    if (array.length === 0)
        return exports.emptyArray;
    var last = array[0];
    var deduplicated = [last];
    for (var i = 1; i < array.length; i++) {
        var next = array[i];
        switch (comparer(next, last)) {
            // equality comparison
            case true:
            // relational comparison
            // falls through
            case Comparison.EqualTo:
                continue;
            case Comparison.LessThan:
                // If `array` is sorted, `next` should **never** be less than `last`.
                return Debug.fail('Array is unsorted.');
        }
        deduplicated.push((last = next));
    }
    return deduplicated;
}
function insertSorted(array, insert, compare) {
    if (array.length === 0) {
        array.push(insert);
        return;
    }
    var insertIndex = binarySearch(array, insert, identity, compare);
    if (insertIndex < 0) {
        array.splice(~insertIndex, 0, insert);
    }
}
exports.insertSorted = insertSorted;
function sortAndDeduplicate(array, comparer, equalityComparer) {
    return deduplicateSorted(sort(array, comparer), equalityComparer || comparer || compareStringsCaseSensitive);
}
exports.sortAndDeduplicate = sortAndDeduplicate;
function arrayIsEqualTo(array1, array2, equalityComparer) {
    if (equalityComparer === void 0) { equalityComparer = equateValues; }
    if (!array1 || !array2) {
        return array1 === array2;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    for (var i = 0; i < array1.length; i++) {
        if (!equalityComparer(array1[i], array2[i], i)) {
            return false;
        }
    }
    return true;
}
exports.arrayIsEqualTo = arrayIsEqualTo;
function compact(array) {
    var result;
    if (array) {
        for (var i = 0; i < array.length; i++) {
            var v = array[i];
            if (result || !v) {
                if (!result) {
                    result = array.slice(0, i);
                }
                if (v) {
                    result.push(v);
                }
            }
        }
    }
    return result || array;
}
exports.compact = compact;
/**
 * Gets the relative complement of `arrayA` with respect to `arrayB`, returning the elements that
 * are not present in `arrayA` but are present in `arrayB`. Assumes both arrays are sorted
 * based on the provided comparer.
 */
function relativeComplement(arrayA, arrayB, comparer) {
    if (!arrayB || !arrayA || arrayB.length === 0 || arrayA.length === 0)
        return arrayB;
    var result = [];
    loopB: for (var offsetA = 0, offsetB = 0; offsetB < arrayB.length; offsetB++) {
        if (offsetB > 0) {
            // Ensure `arrayB` is properly sorted.
            Debug.assertGreaterThanOrEqual(comparer(arrayB[offsetB], arrayB[offsetB - 1]), Comparison.EqualTo);
        }
        loopA: for (var startA = offsetA; offsetA < arrayA.length; offsetA++) {
            if (offsetA > startA) {
                // Ensure `arrayA` is properly sorted. We only need to perform this check if
                // `offsetA` has changed since we entered the loop.
                Debug.assertGreaterThanOrEqual(comparer(arrayA[offsetA], arrayA[offsetA - 1]), Comparison.EqualTo);
            }
            switch (comparer(arrayB[offsetB], arrayA[offsetA])) {
                case Comparison.LessThan:
                    // If B is less than A, B does not exist in arrayA. Add B to the result and
                    // move to the next element in arrayB without changing the current position
                    // in arrayA.
                    result.push(arrayB[offsetB]);
                    continue loopB;
                case Comparison.EqualTo:
                    // If B is equal to A, B exists in arrayA. Move to the next element in
                    // arrayB without adding B to the result or changing the current position
                    // in arrayA.
                    continue loopB;
                case Comparison.GreaterThan:
                    // If B is greater than A, we need to keep looking for B in arrayA. Move to
                    // the next element in arrayA and recheck.
                    continue loopA;
            }
        }
    }
    return result;
}
exports.relativeComplement = relativeComplement;
function sum(array, prop) {
    var result = 0;
    for (var _i = 0, array_5 = array; _i < array_5.length; _i++) {
        var v = array_5[_i];
        result += v[prop];
    }
    return result;
}
exports.sum = sum;
function append(to, value) {
    if (value === undefined)
        return to;
    if (to === undefined)
        return [value];
    to.push(value);
    return to;
}
exports.append = append;
function combine(xs, ys) {
    if (xs === undefined)
        return ys;
    if (ys === undefined)
        return xs;
    if (isArray(xs))
        return isArray(ys) ? concatenate(xs, ys) : append(xs, ys);
    if (isArray(ys))
        return append(ys, xs);
    return [xs, ys];
}
exports.combine = combine;
/**
 * Gets the actual offset into an array for a relative offset. Negative offsets indicate a
 * position offset from the end of the array.
 */
function toOffset(array, offset) {
    return offset < 0 ? array.length + offset : offset;
}
function addRange(to, from, start, end) {
    if (from === undefined || from.length === 0)
        return to;
    if (to === undefined)
        return from.slice(start, end);
    start = start === undefined ? 0 : toOffset(from, start);
    end = end === undefined ? from.length : toOffset(from, end);
    for (var i = start; i < end && i < from.length; i++) {
        if (from[i] !== undefined) {
            to.push(from[i]);
        }
    }
    return to;
}
exports.addRange = addRange;
/**
 * @return Whether the value was added.
 */
function pushIfUnique(array, toAdd, equalityComparer) {
    if (contains(array, toAdd, equalityComparer)) {
        return false;
    }
    else {
        array.push(toAdd);
        return true;
    }
}
exports.pushIfUnique = pushIfUnique;
/**
 * Unlike `pushIfUnique`, this can take `undefined` as an input, and returns a new array.
 */
function appendIfUnique(array, toAdd, equalityComparer) {
    if (array) {
        pushIfUnique(array, toAdd, equalityComparer);
        return array;
    }
    else {
        return [toAdd];
    }
}
exports.appendIfUnique = appendIfUnique;
function stableSortIndices(array, indices, comparer) {
    // sort indices by value then position
    indices.sort(function (x, y) { return comparer(array[x], array[y]) || compareValues(x, y); });
}
/**
 * Returns a new sorted array.
 */
function sort(array, comparer) {
    return (array.length === 0 ? array : array.slice().sort(comparer));
}
exports.sort = sort;
function arrayIterator(array) {
    var i = 0;
    return {
        next: function () {
            if (i === array.length) {
                return { value: undefined, done: true };
            }
            else {
                i++;
                return { value: array[i - 1], done: false };
            }
        }
    };
}
exports.arrayIterator = arrayIterator;
function arrayReverseIterator(array) {
    var i = array.length;
    return {
        next: function () {
            if (i === 0) {
                return { value: undefined, done: true };
            }
            else {
                i--;
                return { value: array[i], done: false };
            }
        }
    };
}
exports.arrayReverseIterator = arrayReverseIterator;
/**
 * Stable sort of an array. Elements equal to each other maintain their relative position in the array.
 */
function stableSort(array, comparer) {
    var indices = indicesOf(array);
    stableSortIndices(array, indices, comparer);
    return indices.map(function (i) { return array[i]; });
}
exports.stableSort = stableSort;
function rangeEquals(array1, array2, pos, end) {
    while (pos < end) {
        if (array1[pos] !== array2[pos]) {
            return false;
        }
        pos++;
    }
    return true;
}
exports.rangeEquals = rangeEquals;
/**
 * Returns the element at a specific offset in an array if non-empty, `undefined` otherwise.
 * A negative offset indicates the element should be retrieved from the end of the array.
 */
function elementAt(array, offset) {
    if (array) {
        offset = toOffset(array, offset);
        if (offset < array.length) {
            return array[offset];
        }
    }
    return undefined;
}
exports.elementAt = elementAt;
/**
 * Returns the first element of an array if non-empty, `undefined` otherwise.
 */
function firstOrUndefined(array) {
    return array.length === 0 ? undefined : array[0];
}
exports.firstOrUndefined = firstOrUndefined;
function first(array) {
    Debug.assert(array.length !== 0);
    return array[0];
}
exports.first = first;
/**
 * Returns the last element of an array if non-empty, `undefined` otherwise.
 */
function lastOrUndefined(array) {
    return array.length === 0 ? undefined : array[array.length - 1];
}
exports.lastOrUndefined = lastOrUndefined;
function last(array) {
    Debug.assert(array.length !== 0);
    return array[array.length - 1];
}
exports.last = last;
/**
 * Returns the only element of an array if it contains only one element, `undefined` otherwise.
 */
function singleOrUndefined(array) {
    return array && array.length === 1 ? array[0] : undefined;
}
exports.singleOrUndefined = singleOrUndefined;
function singleOrMany(array) {
    return array && array.length === 1 ? array[0] : array;
}
exports.singleOrMany = singleOrMany;
function replaceElement(array, index, value) {
    var result = array.slice(0);
    result[index] = value;
    return result;
}
exports.replaceElement = replaceElement;
/**
 * Performs a binary search, finding the index at which `value` occurs in `array`.
 * If no such index is found, returns the 2's-complement of first index at which
 * `array[index]` exceeds `value`.
 * @param array A sorted array whose first element must be no larger than number
 * @param value The value to be searched for in the array.
 * @param keySelector A callback used to select the search key from `value` and each element of
 * `array`.
 * @param keyComparer A callback used to compare two keys in a sorted array.
 * @param offset An offset into `array` at which to start the search.
 */
function binarySearch(array, value, keySelector, keyComparer, offset) {
    return binarySearchKey(array, keySelector(value), keySelector, keyComparer, offset);
}
exports.binarySearch = binarySearch;
/**
 * Performs a binary search, finding the index at which an object with `key` occurs in `array`.
 * If no such index is found, returns the 2's-complement of first index at which
 * `array[index]` exceeds `key`.
 * @param array A sorted array whose first element must be no larger than number
 * @param key The key to be searched for in the array.
 * @param keySelector A callback used to select the search key from each element of `array`.
 * @param keyComparer A callback used to compare two keys in a sorted array.
 * @param offset An offset into `array` at which to start the search.
 */
function binarySearchKey(array, key, keySelector, keyComparer, offset) {
    if (!some(array)) {
        return -1;
    }
    var low = offset || 0;
    var high = array.length - 1;
    while (low <= high) {
        var middle = low + ((high - low) >> 1);
        var midKey = keySelector(array[middle]);
        switch (keyComparer(midKey, key)) {
            case Comparison.LessThan:
                low = middle + 1;
                break;
            case Comparison.EqualTo:
                return middle;
            case Comparison.GreaterThan:
                high = middle - 1;
                break;
        }
    }
    return ~low;
}
exports.binarySearchKey = binarySearchKey;
function reduceLeft(array, f, initial, start, count) {
    if (array && array.length > 0) {
        var size = array.length;
        if (size > 0) {
            var pos = start === undefined || start < 0 ? 0 : start;
            var end = count === undefined || pos + count > size - 1 ? size - 1 : pos + count;
            var result = void 0;
            if (arguments.length <= 2) {
                result = array[pos];
                pos++;
            }
            else {
                result = initial;
            }
            while (pos <= end) {
                result = f(result, array[pos], pos);
                pos++;
            }
            return result;
        }
    }
    return initial;
}
exports.reduceLeft = reduceLeft;
var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * Indicates whether a map-like contains an own property with the specified key.
 *
 * @param map A map-like.
 * @param key A property key.
 */
function hasProperty(map, key) {
    return hasOwnProperty.call(map, key);
}
exports.hasProperty = hasProperty;
/**
 * Gets the value of an owned property in a map-like.
 *
 * @param map A map-like.
 * @param key A property key.
 */
function getProperty(map, key) {
    return hasOwnProperty.call(map, key) ? map[key] : undefined;
}
exports.getProperty = getProperty;
/**
 * Gets the owned, enumerable property keys of a map-like.
 */
function getOwnKeys(map) {
    var keys = [];
    for (var key in map) {
        if (hasOwnProperty.call(map, key)) {
            keys.push(key);
        }
    }
    return keys;
}
exports.getOwnKeys = getOwnKeys;
function getAllKeys(obj) {
    var result = [];
    do {
        var names = Object.getOwnPropertyNames(obj);
        for (var _i = 0, names_1 = names; _i < names_1.length; _i++) {
            var name_1 = names_1[_i];
            pushIfUnique(result, name_1);
        }
    } while ((obj = Object.getPrototypeOf(obj)));
    return result;
}
exports.getAllKeys = getAllKeys;
function getOwnValues(sparseArray) {
    var values = [];
    for (var key in sparseArray) {
        if (hasOwnProperty.call(sparseArray, key)) {
            values.push(sparseArray[key]);
        }
    }
    return values;
}
exports.getOwnValues = getOwnValues;
function arrayFrom(iterator, map) {
    var result = [];
    for (var iterResult = iterator.next(); !iterResult.done; iterResult = iterator.next()) {
        result.push(map ? map(iterResult.value) : iterResult.value);
    }
    return result;
}
exports.arrayFrom = arrayFrom;
function assign(t) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
        var arg = args_1[_a];
        if (arg === undefined)
            continue;
        for (var p in arg) {
            if (hasProperty(arg, p)) {
                t[p] = arg[p];
            }
        }
    }
    return t;
}
exports.assign = assign;
/**
 * Performs a shallow equality comparison of the contents of two map-likes.
 *
 * @param left A map-like whose properties should be compared.
 * @param right A map-like whose properties should be compared.
 */
function equalOwnProperties(left, right, equalityComparer) {
    if (equalityComparer === void 0) { equalityComparer = equateValues; }
    if (left === right)
        return true;
    if (!left || !right)
        return false;
    for (var key in left) {
        if (hasOwnProperty.call(left, key)) {
            if (!hasOwnProperty.call(right, key))
                return false;
            if (!equalityComparer(left[key], right[key]))
                return false;
        }
    }
    for (var key in right) {
        if (hasOwnProperty.call(right, key)) {
            if (!hasOwnProperty.call(left, key))
                return false;
        }
    }
    return true;
}
exports.equalOwnProperties = equalOwnProperties;
function arrayToMap(array, makeKey, makeValue) {
    if (makeValue === void 0) { makeValue = identity; }
    var result = createMap();
    for (var _i = 0, array_6 = array; _i < array_6.length; _i++) {
        var value = array_6[_i];
        var key = makeKey(value);
        if (key !== undefined)
            result.set(key, makeValue(value));
    }
    return result;
}
exports.arrayToMap = arrayToMap;
function arrayToNumericMap(array, makeKey, makeValue) {
    if (makeValue === void 0) { makeValue = identity; }
    var result = [];
    for (var _i = 0, array_7 = array; _i < array_7.length; _i++) {
        var value = array_7[_i];
        result[makeKey(value)] = makeValue(value);
    }
    return result;
}
exports.arrayToNumericMap = arrayToNumericMap;
function arrayToMultiMap(values, makeKey, makeValue) {
    if (makeValue === void 0) { makeValue = identity; }
    var result = createMultiMap();
    for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
        var value = values_1[_i];
        result.add(makeKey(value), makeValue(value));
    }
    return result;
}
exports.arrayToMultiMap = arrayToMultiMap;
function group(values, getGroupId, resultSelector) {
    if (resultSelector === void 0) { resultSelector = identity; }
    return arrayFrom(arrayToMultiMap(values, getGroupId).values(), resultSelector);
}
exports.group = group;
function clone(object) {
    var result = {};
    for (var id in object) {
        if (hasOwnProperty.call(object, id)) {
            result[id] = object[id];
        }
    }
    return result;
}
exports.clone = clone;
/**
 * Creates a new object by adding the own properties of `second`, then the own properties of `first`.
 *
 * NOTE: This means that if a property exists in both `first` and `second`, the property in `first` will be chosen.
 */
function extend(first, second) {
    var result = {};
    for (var id in second) {
        if (hasOwnProperty.call(second, id)) {
            result[id] = second[id];
        }
    }
    for (var id in first) {
        if (hasOwnProperty.call(first, id)) {
            result[id] = first[id];
        }
    }
    return result;
}
exports.extend = extend;
function copyProperties(first, second) {
    for (var id in second) {
        if (hasOwnProperty.call(second, id)) {
            first[id] = second[id];
        }
    }
}
exports.copyProperties = copyProperties;
function maybeBind(obj, fn) {
    return fn ? fn.bind(obj) : undefined;
}
exports.maybeBind = maybeBind;
function mapMap(map, f) {
    var result = createMap();
    map.forEach(function (t, key) { return result.set.apply(result, f(t, key)); });
    return result;
}
exports.mapMap = mapMap;
function createMultiMap() {
    var map = createMap();
    map.add = multiMapAdd;
    map.remove = multiMapRemove;
    return map;
}
exports.createMultiMap = createMultiMap;
function multiMapAdd(key, value) {
    var values = this.get(key);
    if (values) {
        values.push(value);
    }
    else {
        this.set(key, (values = [value]));
    }
    return values;
}
function multiMapRemove(key, value) {
    var values = this.get(key);
    if (values) {
        unorderedRemoveItem(values, value);
        if (!values.length) {
            this["delete"](key);
        }
    }
}
function createUnderscoreEscapedMultiMap() {
    return createMultiMap();
}
exports.createUnderscoreEscapedMultiMap = createUnderscoreEscapedMultiMap;
/**
 * Tests whether a value is an array.
 */
function isArray(value) {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}
exports.isArray = isArray;
function toArray(value) {
    return isArray(value) ? value : [value];
}
exports.toArray = toArray;
/**
 * Tests whether a value is string
 */
function isString(text) {
    return typeof text === 'string';
}
exports.isString = isString;
function isNumber(x) {
    return typeof x === 'number';
}
exports.isNumber = isNumber;
function tryCast(value, test) {
    return value !== undefined && test(value) ? value : undefined;
}
exports.tryCast = tryCast;
function cast(value, test) {
    if (value !== undefined && test(value))
        return value;
    return Debug.fail("Invalid cast. The supplied value " + value + " did not pass the test '" + Debug.getFunctionName(test) + "'.");
}
exports.cast = cast;
/** Does nothing. */
function noop(_) { }
exports.noop = noop;
/** Do nothing and return false */
function returnFalse() {
    return false;
}
exports.returnFalse = returnFalse;
/** Do nothing and return true */
function returnTrue() {
    return true;
}
exports.returnTrue = returnTrue;
/** Do nothing and return undefined */
function returnUndefined() {
    return undefined;
}
exports.returnUndefined = returnUndefined;
/** Returns its argument. */
function identity(x) {
    return x;
}
exports.identity = identity;
/** Returns lower case string */
function toLowerCase(x) {
    return x.toLowerCase();
}
exports.toLowerCase = toLowerCase;
// We convert the file names to lower case as key for file name on case insensitive file system
// While doing so we need to handle special characters (eg \u0130) to ensure that we dont convert
// it to lower case, fileName with its lowercase form can exist along side it.
// Handle special characters and make those case sensitive instead
//
// |-#--|-Unicode--|-Char code-|-Desc-------------------------------------------------------------------|
// | 1. | i        | 105       | Ascii i                                                                |
// | 2. | I        | 73        | Ascii I                                                                |
// |-------- Special characters ------------------------------------------------------------------------|
// | 3. | \u0130   | 304       | Uppper case I with dot above                                           |
// | 4. | i,\u0307 | 105,775   | i, followed by 775: Lower case of (3rd item)                           |
// | 5. | I,\u0307 | 73,775    | I, followed by 775: Upper case of (4th item), lower case is (4th item) |
// | 6. | \u0131   | 305       | Lower case i without dot, upper case is I (2nd item)                   |
// | 7. | \u00DF   | 223       | Lower case sharp s                                                     |
//
// Because item 3 is special where in its lowercase character has its own
// upper case form we cant convert its case.
// Rest special characters are either already in lower case format or
// they have corresponding upper case character so they dont need special handling
//
// But to avoid having to do string building for most common cases, also ignore
// a-z, 0-9, \u0131, \u00DF, \, /, ., : and space
var fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g;
/**
 * Case insensitive file systems have descripencies in how they handle some characters (eg. turkish Upper case I with dot on top - \u0130)
 * This function is used in places where we want to make file name as a key on these systems
 * It is possible on mac to be able to refer to file name with I with dot on top as a fileName with its lower case form
 * But on windows we cannot. Windows can have fileName with I with dot on top next to its lower case and they can not each be referred with the lowercase forms
 * Technically we would want this function to be platform sepcific as well but
 * our api has till now only taken caseSensitive as the only input and just for some characters we dont want to update API and ensure all customers use those api
 * We could use upper case and we would still need to deal with the descripencies but
 * we want to continue using lower case since in most cases filenames are lowercasewe and wont need any case changes and avoid having to store another string for the key
 * So for this function purpose, we go ahead and assume character I with dot on top it as case sensitive since its very unlikely to use lower case form of that special character
 */
function toFileNameLowerCase(x) {
    return fileNameLowerCaseRegExp.test(x) ? x.replace(fileNameLowerCaseRegExp, toLowerCase) : x;
}
exports.toFileNameLowerCase = toFileNameLowerCase;
/** Throws an error because a function is not implemented. */
function notImplemented() {
    throw new Error('Not implemented');
}
exports.notImplemented = notImplemented;
function memoize(callback) {
    var value;
    return function () {
        if (callback) {
            value = callback();
            callback = undefined;
        }
        return value;
    };
}
exports.memoize = memoize;
function compose(a, b, c, d, e) {
    if (!!e) {
        var args_2 = [];
        for (var i = 0; i < arguments.length; i++) {
            args_2[i] = arguments[i];
        }
        return function (t) { return reduceLeft(args_2, function (u, f) { return f(u); }, t); };
    }
    else if (d) {
        return function (t) { return d(c(b(a(t)))); };
    }
    else if (c) {
        return function (t) { return c(b(a(t))); };
    }
    else if (b) {
        return function (t) { return b(a(t)); };
    }
    else if (a) {
        return function (t) { return a(t); };
    }
    else {
        return function (t) { return t; };
    }
}
exports.compose = compose;
function equateValues(a, b) {
    return a === b;
}
exports.equateValues = equateValues;
/**
 * Compare the equality of two strings using a case-sensitive ordinal comparison.
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point after applying `toUpperCase` to each string. We always map both
 * strings to their upper-case form as some unicode characters do not properly round-trip to
 * lowercase (such as `ẞ` (German sharp capital s)).
 */
function equateStringsCaseInsensitive(a, b) {
    return a === b || (a !== undefined && b !== undefined && a.toUpperCase() === b.toUpperCase());
}
exports.equateStringsCaseInsensitive = equateStringsCaseInsensitive;
/**
 * Compare the equality of two strings using a case-sensitive ordinal comparison.
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the
 * integer value of each code-point.
 */
function equateStringsCaseSensitive(a, b) {
    return equateValues(a, b);
}
exports.equateStringsCaseSensitive = equateStringsCaseSensitive;
function compareComparableValues(a, b) {
    return a === b ? Comparison.EqualTo : a === undefined ? Comparison.LessThan : b === undefined ? Comparison.GreaterThan : a < b ? Comparison.LessThan : Comparison.GreaterThan;
}
/**
 * Compare two numeric values for their order relative to each other.
 * To compare strings, use any of the `compareStrings` functions.
 */
function compareValues(a, b) {
    return compareComparableValues(a, b);
}
exports.compareValues = compareValues;
/**
 * Compare two TextSpans, first by `start`, then by `length`.
 */
function compareTextSpans(a, b) {
    return compareValues(a === null || a === void 0 ? void 0 : a.start, b === null || b === void 0 ? void 0 : b.start) || compareValues(a === null || a === void 0 ? void 0 : a.length, b === null || b === void 0 ? void 0 : b.length);
}
exports.compareTextSpans = compareTextSpans;
function min(a, b, compare) {
    return compare(a, b) === Comparison.LessThan ? a : b;
}
exports.min = min;
/**
 * Compare two strings using a case-insensitive ordinal comparison.
 *
 * Ordinal comparisons are based on the difference between the unicode code points of both
 * strings. Characters with multiple unicode representations are considered unequal. Ordinal
 * comparisons provide predictable ordering, but place "a" after "B".
 *
 * Case-insensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point after applying `toUpperCase` to each string. We always map both
 * strings to their upper-case form as some unicode characters do not properly round-trip to
 * lowercase (such as `áºž` (German sharp capital s)).
 */
function compareStringsCaseInsensitive(a, b) {
    if (a === b)
        return Comparison.EqualTo;
    if (a === undefined)
        return Comparison.LessThan;
    if (b === undefined)
        return Comparison.GreaterThan;
    a = a.toUpperCase();
    b = b.toUpperCase();
    return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
}
exports.compareStringsCaseInsensitive = compareStringsCaseInsensitive;
/**
 * Compare two strings using a case-sensitive ordinal comparison.
 *
 * Ordinal comparisons are based on the difference between the unicode code points of both
 * strings. Characters with multiple unicode representations are considered unequal. Ordinal
 * comparisons provide predictable ordering, but place "a" after "B".
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point.
 */
function compareStringsCaseSensitive(a, b) {
    return compareComparableValues(a, b);
}
exports.compareStringsCaseSensitive = compareStringsCaseSensitive;
function getStringComparer(ignoreCase) {
    return ignoreCase ? compareStringsCaseInsensitive : compareStringsCaseSensitive;
}
exports.getStringComparer = getStringComparer;
/**
 * Creates a string comparer for use with string collation in the UI.
 */
var createUIStringComparer = (function () {
    var defaultComparer;
    var enUSComparer;
    var stringComparerFactory = getStringComparerFactory();
    return createStringComparer;
    function compareWithCallback(a, b, comparer) {
        if (a === b)
            return Comparison.EqualTo;
        if (a === undefined)
            return Comparison.LessThan;
        if (b === undefined)
            return Comparison.GreaterThan;
        var value = comparer(a, b);
        return value < 0 ? Comparison.LessThan : value > 0 ? Comparison.GreaterThan : Comparison.EqualTo;
    }
    function createIntlCollatorStringComparer(locale) {
        // Intl.Collator.prototype.compare is bound to the collator. See NOTE in
        // http://www.ecma-international.org/ecma-402/2.0/#sec-Intl.Collator.prototype.compare
        var comparer = new Intl.Collator(locale, { usage: 'sort', sensitivity: 'variant' }).compare;
        return function (a, b) { return compareWithCallback(a, b, comparer); };
    }
    function createLocaleCompareStringComparer(locale) {
        // if the locale is not the default locale (`undefined`), use the fallback comparer.
        if (locale !== undefined)
            return createFallbackStringComparer();
        return function (a, b) { return compareWithCallback(a, b, compareStrings); };
        function compareStrings(a, b) {
            return a.localeCompare(b);
        }
    }
    function createFallbackStringComparer() {
        // An ordinal comparison puts "A" after "b", but for the UI we want "A" before "b".
        // We first sort case insensitively.  So "Aaa" will come before "baa".
        // Then we sort case sensitively, so "aaa" will come before "Aaa".
        //
        // For case insensitive comparisons we always map both strings to their
        // upper-case form as some unicode characters do not properly round-trip to
        // lowercase (such as `áºž` (German sharp capital s)).
        return function (a, b) { return compareWithCallback(a, b, compareDictionaryOrder); };
        function compareDictionaryOrder(a, b) {
            return compareStrings(a.toUpperCase(), b.toUpperCase()) || compareStrings(a, b);
        }
        function compareStrings(a, b) {
            return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
        }
    }
    function getStringComparerFactory() {
        // If the host supports Intl, we use it for comparisons using the default locale.
        if (typeof Intl === 'object' && typeof Intl.Collator === 'function') {
            return createIntlCollatorStringComparer;
        }
        // If the host does not support Intl, we fall back to localeCompare.
        // localeCompare in Node v0.10 is just an ordinal comparison, so don't use it.
        if (typeof String.prototype.localeCompare === 'function' && typeof String.prototype.toLocaleUpperCase === 'function' && 'a'.localeCompare('B') < 0) {
            return createLocaleCompareStringComparer;
        }
        // Otherwise, fall back to ordinal comparison:
        return createFallbackStringComparer;
    }
    function createStringComparer(locale) {
        // Hold onto common string comparers. This avoids constantly reallocating comparers during
        // tests.
        if (locale === undefined) {
            return defaultComparer || (defaultComparer = stringComparerFactory(locale));
        }
        else if (locale === 'en-US') {
            return enUSComparer || (enUSComparer = stringComparerFactory(locale));
        }
        else {
            return stringComparerFactory(locale);
        }
    }
})();
var uiComparerCaseSensitive;
var uiLocale;
function getUILocale() {
    return uiLocale;
}
exports.getUILocale = getUILocale;
function setUILocale(value) {
    if (uiLocale !== value) {
        uiLocale = value;
        uiComparerCaseSensitive = undefined;
    }
}
exports.setUILocale = setUILocale;
/**
 * Compare two strings in a using the case-sensitive sort behavior of the UI locale.
 *
 * Ordering is not predictable between different host locales, but is best for displaying
 * ordered data for UI presentation. Characters with multiple unicode representations may
 * be considered equal.
 *
 * Case-sensitive comparisons compare strings that differ in base characters, or
 * accents/diacritic marks, or case as unequal.
 */
function compareStringsCaseSensitiveUI(a, b) {
    var comparer = uiComparerCaseSensitive || (uiComparerCaseSensitive = createUIStringComparer(uiLocale));
    return comparer(a, b);
}
exports.compareStringsCaseSensitiveUI = compareStringsCaseSensitiveUI;
function compareProperties(a, b, key, comparer) {
    return a === b ? Comparison.EqualTo : a === undefined ? Comparison.LessThan : b === undefined ? Comparison.GreaterThan : comparer(a[key], b[key]);
}
exports.compareProperties = compareProperties;
/** True is greater than false. */
function compareBooleans(a, b) {
    return compareValues(a ? 1 : 0, b ? 1 : 0);
}
exports.compareBooleans = compareBooleans;
/**
 * Given a name and a list of names that are *not* equal to the name, return a spelling suggestion if there is one that is close enough.
 * Names less than length 3 only check for case-insensitive equality, not Levenshtein distance.
 *
 * If there is a candidate that's the same except for case, return that.
 * If there is a candidate that's within one edit of the name, return that.
 * Otherwise, return the candidate with the smallest Levenshtein distance,
 *    except for candidates:
 *      * With no name
 *      * Whose length differs from the target name by more than 0.34 of the length of the name.
 *      * Whose levenshtein distance is more than 0.4 of the length of the name
 *        (0.4 allows 1 substitution/transposition for every 5 characters,
 *         and 1 insertion/deletion at 3 characters)
 */
function getSpellingSuggestion(name, candidates, getName) {
    var maximumLengthDifference = Math.min(2, Math.floor(name.length * 0.34));
    var bestDistance = Math.floor(name.length * 0.4) + 1; // If the best result isn't better than this, don't bother.
    var bestCandidate;
    var justCheckExactMatches = false;
    var nameLowerCase = name.toLowerCase();
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        var candidateName = getName(candidate);
        if (candidateName !== undefined && Math.abs(candidateName.length - nameLowerCase.length) <= maximumLengthDifference) {
            var candidateNameLowerCase = candidateName.toLowerCase();
            if (candidateNameLowerCase === nameLowerCase) {
                if (candidateName === name) {
                    continue;
                }
                return candidate;
            }
            if (justCheckExactMatches) {
                continue;
            }
            if (candidateName.length < 3) {
                // Don't bother, user would have noticed a 2-character name having an extra character
                continue;
            }
            // Only care about a result better than the best so far.
            var distance = levenshteinWithMax(nameLowerCase, candidateNameLowerCase, bestDistance - 1);
            if (distance === undefined) {
                continue;
            }
            if (distance < 3) {
                justCheckExactMatches = true;
                bestCandidate = candidate;
            }
            else {
                Debug.assert(distance < bestDistance); // Else `levenshteinWithMax` should return undefined
                bestDistance = distance;
                bestCandidate = candidate;
            }
        }
    }
    return bestCandidate;
}
exports.getSpellingSuggestion = getSpellingSuggestion;
function levenshteinWithMax(s1, s2, max) {
    var previous = new Array(s2.length + 1);
    var current = new Array(s2.length + 1);
    /** Represents any value > max. We don't care about the particular value. */
    var big = max + 1;
    for (var i = 0; i <= s2.length; i++) {
        previous[i] = i;
    }
    for (var i = 1; i <= s1.length; i++) {
        var c1 = s1.charCodeAt(i - 1);
        var minJ = i > max ? i - max : 1;
        var maxJ = s2.length > max + i ? max + i : s2.length;
        current[0] = i;
        /** Smallest value of the matrix in the ith column. */
        var colMin = i;
        for (var j = 1; j < minJ; j++) {
            current[j] = big;
        }
        for (var j = minJ; j <= maxJ; j++) {
            var dist = c1 === s2.charCodeAt(j - 1) ? previous[j - 1] : Math.min(/*delete*/ previous[j] + 1, /*insert*/ current[j - 1] + 1, /*substitute*/ previous[j - 1] + 2);
            current[j] = dist;
            colMin = Math.min(colMin, dist);
        }
        for (var j = maxJ + 1; j <= s2.length; j++) {
            current[j] = big;
        }
        if (colMin > max) {
            // Give up -- everything in this column is > max and it can't get better in future columns.
            return undefined;
        }
        var temp = previous;
        previous = current;
        current = temp;
    }
    var res = previous[s2.length];
    return res > max ? undefined : res;
}
function endsWith(str, suffix) {
    var expectedPos = str.length - suffix.length;
    return expectedPos >= 0 && str.indexOf(suffix, expectedPos) === expectedPos;
}
exports.endsWith = endsWith;
function removeSuffix(str, suffix) {
    return endsWith(str, suffix) ? str.slice(0, str.length - suffix.length) : str;
}
exports.removeSuffix = removeSuffix;
function tryRemoveSuffix(str, suffix) {
    return endsWith(str, suffix) ? str.slice(0, str.length - suffix.length) : undefined;
}
exports.tryRemoveSuffix = tryRemoveSuffix;
function stringContains(str, substring) {
    return str.indexOf(substring) !== -1;
}
exports.stringContains = stringContains;
/**
 * Takes a string like "jquery-min.4.2.3" and returns "jquery"
 */
function removeMinAndVersionNumbers(fileName) {
    // Match a "." or "-" followed by a version number or 'min' at the end of the name
    var trailingMinOrVersion = /[.-]((min)|(\d+(\.\d+)*))$/;
    // The "min" or version may both be present, in either order, so try applying the above twice.
    return fileName.replace(trailingMinOrVersion, '').replace(trailingMinOrVersion, '');
}
exports.removeMinAndVersionNumbers = removeMinAndVersionNumbers;
/** Remove an item from an array, moving everything to its right one space left. */
function orderedRemoveItem(array, item) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === item) {
            orderedRemoveItemAt(array, i);
            return true;
        }
    }
    return false;
}
exports.orderedRemoveItem = orderedRemoveItem;
/** Remove an item by index from an array, moving everything to its right one space left. */
function orderedRemoveItemAt(array, index) {
    // This seems to be faster than either `array.splice(i, 1)` or `array.copyWithin(i, i+ 1)`.
    for (var i = index; i < array.length - 1; i++) {
        array[i] = array[i + 1];
    }
    array.pop();
}
exports.orderedRemoveItemAt = orderedRemoveItemAt;
function unorderedRemoveItemAt(array, index) {
    // Fill in the "hole" left at `index`.
    array[index] = array[array.length - 1];
    array.pop();
}
exports.unorderedRemoveItemAt = unorderedRemoveItemAt;
/** Remove the *first* occurrence of `item` from the array. */
function unorderedRemoveItem(array, item) {
    return unorderedRemoveFirstItemWhere(array, function (element) { return element === item; });
}
exports.unorderedRemoveItem = unorderedRemoveItem;
/** Remove the *first* element satisfying `predicate`. */
function unorderedRemoveFirstItemWhere(array, predicate) {
    for (var i = 0; i < array.length; i++) {
        if (predicate(array[i])) {
            unorderedRemoveItemAt(array, i);
            return true;
        }
    }
    return false;
}
function createGetCanonicalFileName(useCaseSensitiveFileNames) {
    return useCaseSensitiveFileNames ? identity : toFileNameLowerCase;
}
exports.createGetCanonicalFileName = createGetCanonicalFileName;
function patternText(_a) {
    var prefix = _a.prefix, suffix = _a.suffix;
    return prefix + "*" + suffix;
}
exports.patternText = patternText;
/**
 * Given that candidate matches pattern, returns the text matching the '*'.
 * E.g.: matchedText(tryParsePattern("foo*baz"), "foobarbaz") === "bar"
 */
function matchedText(pattern, candidate) {
    Debug.assert(isPatternMatch(pattern, candidate));
    return candidate.substring(pattern.prefix.length, candidate.length - pattern.suffix.length);
}
exports.matchedText = matchedText;
/** Return the object corresponding to the best pattern to match `candidate`. */
function findBestPatternMatch(values, getPattern, candidate) {
    var matchedValue;
    // use length of prefix as betterness criteria
    var longestMatchPrefixLength = -1;
    for (var _i = 0, values_2 = values; _i < values_2.length; _i++) {
        var v = values_2[_i];
        var pattern = getPattern(v);
        if (isPatternMatch(pattern, candidate) && pattern.prefix.length > longestMatchPrefixLength) {
            longestMatchPrefixLength = pattern.prefix.length;
            matchedValue = v;
        }
    }
    return matchedValue;
}
exports.findBestPatternMatch = findBestPatternMatch;
function startsWith(str, prefix) {
    return str.lastIndexOf(prefix, 0) === 0;
}
exports.startsWith = startsWith;
function removePrefix(str, prefix) {
    return startsWith(str, prefix) ? str.substr(prefix.length) : str;
}
exports.removePrefix = removePrefix;
function tryRemovePrefix(str, prefix, getCanonicalFileName) {
    if (getCanonicalFileName === void 0) { getCanonicalFileName = identity; }
    return startsWith(getCanonicalFileName(str), getCanonicalFileName(prefix)) ? str.substring(prefix.length) : undefined;
}
exports.tryRemovePrefix = tryRemovePrefix;
function isPatternMatch(_a, candidate) {
    var prefix = _a.prefix, suffix = _a.suffix;
    return candidate.length >= prefix.length + suffix.length && startsWith(candidate, prefix) && endsWith(candidate, suffix);
}
function and(f, g) {
    return function (arg) { return f(arg) && g(arg); };
}
exports.and = and;
function or() {
    var fs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fs[_i] = arguments[_i];
    }
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        for (var _a = 0, fs_1 = fs; _a < fs_1.length; _a++) {
            var f = fs_1[_a];
            if (f.apply(void 0, args)) {
                return true;
            }
        }
        return false;
    };
}
exports.or = or;
function not(fn) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return !fn.apply(void 0, args);
    };
}
exports.not = not;
function assertType(_) { }
exports.assertType = assertType;
function singleElementArray(t) {
    return t === undefined ? undefined : [t];
}
exports.singleElementArray = singleElementArray;
function enumerateInsertsAndDeletes(newItems, oldItems, comparer, inserted, deleted, unchanged) {
    unchanged = unchanged || noop;
    var newIndex = 0;
    var oldIndex = 0;
    var newLen = newItems.length;
    var oldLen = oldItems.length;
    while (newIndex < newLen && oldIndex < oldLen) {
        var newItem = newItems[newIndex];
        var oldItem = oldItems[oldIndex];
        var compareResult = comparer(newItem, oldItem);
        if (compareResult === Comparison.LessThan) {
            inserted(newItem);
            newIndex++;
        }
        else if (compareResult === Comparison.GreaterThan) {
            deleted(oldItem);
            oldIndex++;
        }
        else {
            unchanged(oldItem, newItem);
            newIndex++;
            oldIndex++;
        }
    }
    while (newIndex < newLen) {
        inserted(newItems[newIndex++]);
    }
    while (oldIndex < oldLen) {
        deleted(oldItems[oldIndex++]);
    }
}
exports.enumerateInsertsAndDeletes = enumerateInsertsAndDeletes;
function fill(length, cb) {
    var result = Array(length);
    for (var i = 0; i < length; i++) {
        result[i] = cb(i);
    }
    return result;
}
exports.fill = fill;
function cartesianProduct(arrays) {
    var result = [];
    cartesianProductWorker(arrays, result, /*outer*/ undefined, 0);
    return result;
}
exports.cartesianProduct = cartesianProduct;
function cartesianProductWorker(arrays, result, outer, index) {
    for (var _i = 0, _a = arrays[index]; _i < _a.length; _i++) {
        var element = _a[_i];
        var inner = void 0;
        if (outer) {
            inner = outer.slice();
            inner.push(element);
        }
        else {
            inner = [element];
        }
        if (index === arrays.length - 1) {
            result.push(inner);
        }
        else {
            cartesianProductWorker(arrays, result, inner, index + 1);
        }
    }
}
function padLeft(s, length) {
    while (s.length < length) {
        s = ' ' + s;
    }
    return s;
}
exports.padLeft = padLeft;
function padRight(s, length) {
    while (s.length < length) {
        s = s + ' ';
    }
    return s;
}
exports.padRight = padRight;
