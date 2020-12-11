var _ = require("lodash");

function initialWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
}

Scope.prototype.$watch = function (
  watchFn,
  listenerFn,
  checkBasedOnValueEquality
) {
  var _this = this;
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {}, // if listenerFn is not provided, just create a dummy function
    checkBasedOnValueEquality: !!checkBasedOnValueEquality,
    last: initialWatchVal,
  };

  this.$$watchers.unshift(watcher); // add to front
  this.$$lastDirtyWatch = null; // handles the case where new watcher is added by the last dirty watcher's listenerFn, ensures that digest short circuit does not occur
  return function () {
    var i = _this.$$watchers.indexOf(watcher);
    if (i >= 0) {
      _this.$$watchers.splice(i, 1);
      _this.$$lastDirtyWatch = null;
    }
  };
};

Scope.prototype.$digest = function () {
  var isDirty;
  var ttl = 10;
  this.$$lastDirtyWatch = null;
  do {
    while (this.$$asyncQueue.length) {
      var asyncTask = this.$$asyncQueue.shift();
      asyncTask.scope.$eval(asyncTask.expression);
    }

    isDirty = this.$$digestOnce();
    if ((isDirty || this.$$asyncQueue.length) && !ttl--) {
      throw "10 digest iterations reached";
    }
  } while (isDirty || this.$$asyncQueue.length);
};

Scope.prototype.$eval = function (expression, locals) {
  return expression(this, locals);
};

Scope.prototype.$evalAsync = function (expr) {
  this.$$asyncQueue.push({ scope: this, expression: expr });
};

Scope.prototype.$apply = function (expr) {
  try {
    return this.$eval(expr);
  } finally {
    this.$digest();
  }
};

Scope.prototype.$$digestOnce = function () {
  // to save the scope obj as this, so that it can be accessed inside the forEach callback
  // watcher.watchFn(scope) instead of watcher.watchFn(window/undefined)
  var _this = this;
  var isDirty, newValue, oldValue;
  // solves problem of a watcher deleting itself during its digest
  _.forEachRight(_this.$$watchers, function (watcher) {
    try {
      if (watcher) {
        newValue = watcher.watchFn(_this); // _this is scope obj
        oldValue = watcher.last;
        if (
          !_this.$$areEqual(
            newValue,
            oldValue,
            watcher.checkBasedOnValueEquality
          )
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
          return false; // short circuit the digest loop
        }
      }
    } catch (e) {
      console.error(e);
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
    // check based on reference - works for primitives
    return (
      newValue === oldValue ||
      (typeof newValue === "number" &&
        typeof oldValue === "number" &&
        isNaN(newValue) &&
        isNaN(oldValue))
    );
  }
};

module.exports = Scope;
