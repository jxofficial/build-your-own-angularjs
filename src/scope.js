var _ = require("lodash");

function initialWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

Scope.prototype.$watch = function (
  watchFn,
  listenerFn,
  checkBasedOnValueEquality
) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {}, // if listenerFn is not provided, just create a dummy function
    checkBasedOnValueEquality: !!checkBasedOnValueEquality,
    last: initialWatchVal,
  };
  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null; // handles the case where new watcher is added by the last ditry watcher's listenerFn, ensures that digest short circuit does not occur
};

Scope.prototype.$digest = function () {
  var isDirty;
  var ttl = 10;
  this.$$lastDirtyWatch = null;
  do {
    isDirty = this.$$digestOnce();
    if (isDirty && !ttl--) {
      throw "10 digest iterations reached";
    }
  } while (isDirty);
};

Scope.prototype.$$digestOnce = function () {
  // to save the scope obj as this, so that it can be accessed inside the forEach callback
  // watcher.watchFn(scope) instead of watcher.watchFn(window/undefined)
  var _this = this;
  var isDirty, newValue, oldValue;
  _.forEach(_this.$$watchers, function (watcher) {
    newValue = watcher.watchFn(_this); // _this is scope obj
    oldValue = watcher.last;
    if (
      !_this.$$areEqual(newValue, oldValue, watcher.checkBasedOnValueEquality)
    ) {
      _this.$$lastDirtyWatch = watcher;

      // need to place here in the event the listenerFn changes the newValue when its not a primitive
      // if primitive, it ok since listenerFn cannot make any the "actual newVal" saved above
      watcher.last = watcher.checkBasedOnValueEquality
        ? _.cloneDeep(newValue)
        : newValue;

      watcher.listenerFn(
        newValue,
        oldValue === initialWatchVal ? newValue : oldValue,
        _this
      );

      isDirty = true;
    } else if (_this.$$lastDirtyWatch === watcher) {
      return false;
    }
  });
  // as long as there is a single watcher that still needs its listenerFn run
  // ie the watched value is diff from the prev cached value in the watcher
  // then run all watches agn
  return isDirty;
};

Scope.prototype.$$areEqual = function (
  newValue,
  oldValue,
  checkBasedOnValueEquality
) {
  if (checkBasedOnValueEquality) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue; // check based on reference - works for primitives
  }
};

module.exports = Scope;
