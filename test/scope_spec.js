"use strict";
var _ = require("lodash");
var Scope = require("../src/scope");

describe("Scope", function () {
  it("can be constructed and used as an object", function () {
    var scope = new Scope();
    scope.aProperty = 1;

    expect(scope.aProperty).toBe(1);
  });
});

describe("digest", function () {
  var scope;

  beforeEach(function () {
    scope = new Scope();
  });

  it("calls the listener function of a watch on first $digest", function () {
    // data you are interested in watching
    var watchFn = function () {
      return "data to be watched";
    };

    var listenerFn = jasmine.createSpy();
    scope.$watch(watchFn, listenerFn);

    scope.$digest();

    expect(listenerFn).toHaveBeenCalled();
  });

  it("calls the watch function with the scope as the argument", function () {
    var watchFn = jasmine.createSpy();
    var listenerFn = function () {};
    scope.$watch(watchFn, listenerFn);
    scope.$digest();

    expect(watchFn).toHaveBeenCalledWith(scope);
  });

  it("calls the listener function when the watched value changes", function () {
    scope.someValue = "a";
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

    scope.someValue = "b";

    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(2); // only runs the listenerFn when it digests and sees a change
  });

  it("calls listener even when first legitimate watch value is set as undefined", function () {
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

  // prevent exposing the initialWatchFn
  it("calls listener with new value as old value instead of initalWatchFn as old value for first digest", function () {
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
  it("may have watchers that omit the listener function", function () {
    var watchFn = jasmine.createSpy().and.returnValue("value to be watched");
    scope.$watch(watchFn); // add watcher to scope's watchers array

    scope.$digest();
    expect(watchFn).toHaveBeenCalled();
  });

  it("triggers chained watches in the same digest call", function () {
    /* 
    Watchers flow 
    name -> scope.initial = scope.nameUpper.substring(0,1) + '.' -> nameUpper
    
    However, since scope.nameUpper/newVal is undefined on the first iteration of all watchers in order, test fails.

    Goal is for first watcher to run again after second watcher has assigned the nameUpper proerty on scope.
    Iterate over all watches until the watched properties stop changing
    */

    scope.name = "Jane";

    scope.$watch(
      function (scope) {
        return scope.nameUpper;
      },
      function (newVal, oldVal, scope) {
        // newVal is supposed to be nameUpper here which is undefined
        // and oldVal is supposed to be the initWatchValFn in the watcher, but passed into listenerFn as the same as newVal (undefined)
        // until the second watcher runs and its listenerFn is called

        // in the second test, newVal and oldVal are both 'JANE', hence this watcher's listenerFn is not called
        if (newVal) scope.initial = newVal.substring(0, 1) + ".";
      }
    );

    scope.$watch(
      function (scope) {
        return scope.name;
      },
      function (newVal, oldVal, scope) {
        // newVal is scope.name
        if (newVal) scope.nameUpper = newVal.toUpperCase();
      }
    );

    scope.$digest();
    expect(scope.initial).toBe("J.");

    scope.name = "Bob";
    scope.$digest();
    expect(scope.initial).toBe("B.");
  });

  it("gives up on the watch after 10 iterations", function () {
    scope.counterA = 0;
    scope.counterB = 0;

    scope.$watch(
      function (scope) {
        return scope.counterA;
      },
      function (newVal, oldVal, scope) {
        scope.counterB++;
      }
    );

    scope.$watch(
      function (scope) {
        return scope.counterB;
      },
      function (newVal, oldVal, scope) {
        scope.counterA++;
      }
    );

    expect(function () {
      scope.$digest();
    }).toThrow();
  });

  it("ends the digest when the last watch is clean", function () {
    scope.arr = _.range(100); // creates an array from 0-99
    var watchExecutions = 0;

    _.times(100, function (i) {
      scope.$watch(
        function (scope) {
          watchExecutions++; // place here because for every watcher looped, it will ALWAYS run the watchFn to get the new watchedVal
          return scope.arr[i];
        },
        function (newVal, oldVal, scope) {}
      );
    });

    scope.$digest();
    expect(watchExecutions).toBe(200);

    scope.arr[0] = 456; // changing the value
    scope.$digest();
    expect(watchExecutions).toBe(301);
  });

  it("does not end digest such that new watches are not run", function () {
    scope.someValue = "abc";
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        return scope.someValue;
      },
      function (newVal, oldVal, scope) {
        // listenerFn adds a new watch
        scope.$watch(
          function (scope) {
            return "some other value for the new watch";
          },
          function (newVal, oldVal, scope) {
            scope.counter++;
          }
        );
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it("compares based on value if enabled", function () {
    scope.arr = [1, 2, 3];
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        return scope.arr;
      },
      function (newVal, oldVal, scope) {
        scope.counter++;
      },
      true
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.arr.push(4);
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it("runs the watch again when listenerFn updates newVal argument, if checking by value is enabled and newVal is non-primitive", function () {
    scope.arr = [1, 2, 3];
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        return scope.arr;
      },
      function (newVal, oldVal, scope) {
        if (!_.includes(newVal, 99)) newVal.push(99);
        scope.counter++;
      },
      true
    );

    expect(scope.arr.length).toBe(3);

    scope.$digest();
    expect(scope.arr.length).toBe(4);
    expect(scope.counter).toBe(2); // runs the watch agn after arr was updated in first digest

    // extra check to make sure that the watch is stable
    scope.$digest();
    expect(scope.arr.length).toBe(4);
    expect(scope.counter).toBe(2);
  });

  it("correctly handles NaNs", function () {
    scope.number = 0 / 0; // NaN
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        return scope.number;
      },
      function (newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it("catches exceptions in watch functions and continues", function () {
    scope.aValue = "abc";
    scope.counter = 0;

    scope.$watch(
      function (scope) {
        throw "Error in watchFn";
      },
      function (newValue, oldValue, scope) {}
    );
    scope.$watch(
      function (scope) {
        return scope.aValue;
      },
      function (newValue, oldValue, scope) {
        scope.counter++;
      }
    );
    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it("catches exceptions in listener functions and continues", function () {
    scope.aValue = "abc";
    scope.counter = 0;
    scope.$watch(
      function (scope) {
        return scope.aValue;
      },
      function (newValue, oldValue, scope) {
        throw "Error in listenerFn";
      }
    );
    scope.$watch(
      function (scope) {
        return scope.aValue;
      },
      function (newValue, oldValue, scope) {
        scope.counter++;
      }
    );
    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it("allows destroying a watch with a removal function", function () {
    scope.aValue = "abc";
    scope.counter = 0;

    var destroyWatch = scope.$watch(
      function (scope) {
        return scope.aValue;
      },
      function (newVal, oldVal, scope) {
        scope.counter++;
      }
    );

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.aValue = "def";
    scope.$digest();
    expect(scope.counter).toBe(2);

    scope.aValue = "xyz";
    destroyWatch();
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it("allows destroying of a watch during digest", function () {
    scope.aValue = "abc";
    scope.watchCalls = [];

    scope.$watch(function (scope) {
      scope.watchCalls.push("first");
      return scope.aValue;
    });

    var destroyWatch = scope.$watch(function (scope) {
      scope.watchCalls.push("second");
      destroyWatch();
    });

    scope.$watch(function (scope) {
      scope.watchCalls.push("third");
      return scope.aValue;
    });

    scope.$digest();
    console.log(scope.watchCalls);
    expect(scope.watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
  });
});
