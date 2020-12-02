var _ = require('lodash');

function initialWatchVal() {}

function Scope() {
  this.$$watchers = [];
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function() {},
    last: initialWatchVal
  };
  this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function() {
  var isDirty;
  do  {
    isDirty = this.$$digestOnce();
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
      watcher.listenerFn(
        newValue, 
        (oldValue === initialWatchVal ? newValue : oldValue),  
        _this);
      
      // update state of watchers
      watcher.last = newValue;
      isDirty = true;
    }
  });
  // as long as there is a single watcher that still needs its listenerFn run
  // ie the watched value is diff from the prev cached value in the watcher
  // then run all watches agn
  return isDirty; 

};

module.exports = Scope;
