var _ = require('lodash');

function initialWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {}, // if listenerFn is not provided, just create a dummy function
    last: initialWatchVal
  };
  this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function () {
  var isDirty;
  var ttl = 10;
  this.$$lastDirtyWatch = null;
  do {
    isDirty = this.$$digestOnce();
    if (isDirty && !(ttl--)) {
      throw '10 digest iterations reached';
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
    if (newValue !== oldValue) {
      _this.$$lastDirtyWatch = watcher;
      watcher.listenerFn(
        newValue,
        oldValue === initialWatchVal ? newValue : oldValue,
        _this
      );
      // update state of watchers
      watcher.last = newValue;
      isDirty = true;
    } else if (_this.$$lastDirtyWatch == watcher) {
      return false;
    }
  });
  // as long as there is a single watcher that still needs its listenerFn run
  // ie the watched value is diff from the prev cached value in the watcher
  // then run all watches agn
  return isDirty;
};

module.exports = Scope;
