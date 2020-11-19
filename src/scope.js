var _ = require('lodash');

function Scope() {
  this.$$watchers = [];
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn
  };
  this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function () {
  // to save the scope obj as this, so that it can be accessed inside the forEach callback
  // watcher.watchFn(scope) instead of watcher.watchFn(window/undefined)
  var _this = this;
  var newValue, oldValue;
  _.forEach(_this.$$watchers, function (watcher) {
    newValue = watcher.watchFn(_this);
    oldValue = watcher.last;
    if (newValue !== oldValue) {
      watcher.last = newValue;
      watcher.listenerFn(newValue, oldValue, _this); // 
    }
  });
};
module.exports = Scope;
