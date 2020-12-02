'use strict';

var Scope = require('../src/scope');

describe('Scope', function () {
  it('can be constructed and used as an object', function () {
    var scope = new Scope();
    scope.aProperty = 1;

    expect(scope.aProperty).toBe(1);
  });
});

describe('digest', function () {
  var scope;

  beforeEach(function () {
    scope = new Scope();
  });

  it('calls the listener function of a watch on first $digest', function () {
    // data you are interested in watching
    var watchFn = function () {
      return 'data to be watched';
    };

    var listenerFn = jasmine.createSpy();
    scope.$watch(watchFn, listenerFn);

    scope.$digest();

    expect(listenerFn).toHaveBeenCalled();
  });

  it('calls the watch function with the scope as the argument', function () {
    var watchFn = jasmine.createSpy();
    var listenerFn = function () {};
    scope.$watch(watchFn, listenerFn);
    scope.$digest();

    expect(watchFn).toHaveBeenCalledWith(scope);
  });

  it('calls the listener function when the watched value changes', function () {
    scope.someValue = 'a';
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        return scope.someValue;
      },
      function (newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    expect(scope.counter).toBe(0);

    // runs the listenerFn on first digest
    scope.$digest();
    expect(scope.counter).toBe(1);

    // since val in watch function hasnt changed, listenerFn counter is still 1
    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.someValue = 'b';

    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('calls listener even when first legitimate watch value is set as undefined', function () {
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        return scope.someValue; // undefined
      },
      function (newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it('calls listener with new value as old value instead of initalWatchFn as old value for first digest', function () {
    scope.someValue = 123;
    var oldValueInFirstListenerCall;

    scope.$watch(
      function (scope) {
        return scope.someValue;
      },
      function (newValue, oldValue, scope) {
        oldValueInFirstListenerCall = oldValue;
      }
    );

    scope.$digest();
    expect(oldValueInFirstListenerCall).toBe(123);
  });

  // this special watcher is used for later when need to be notifed of $digest call
  it('may have watchers that omit the listener function', function () {
    var watchFn = jasmine.createSpy().and.returnValue('value to be watched');
    scope.$watch(watchFn); // add watcher to scope's watchers array

    scope.$digest();
    expect(watchFn).toHaveBeenCalled();
  });

  it('triggers chained watches in the same digest call', function () {
    /* 
    Watchers flow 
    name -> scope.initial = scope.nameUpper.substring(0,1) + '.' -> nameUpper
    
    However, since scope.nameUpper/newVal is undefined on the first iteration of all watchers in order, test fails.

    Goal is for first watcher to run again after second watcher has assigned the nameUpper proerty on scope.
    Iterate over all watches until the watched properties stop changing
    */
    
    scope.name = 'Jane';

    scope.$watch(
      function (scope) {
        return scope.nameUpper;
      },
      function (newVal, oldVal, scope) {
        // newVal is supposed to be nameUpper here
        if (newVal) scope.initial = newVal.substring(0, 1) + '.';
      }
    );

    scope.$watch(
      function (scope) {
        return scope.name;
      },
      function (newVal, oldVal, scope) {
        if (newVal) scope.nameUpper = newVal.toUpperCase();
      }
    );

    scope.$digest();
    expect(scope.initial).toBe('J.');

    scope.name = 'Bob';
    scope.$digest();
    expect(scope.initial).toBe('B.');
  });
});
