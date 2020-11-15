var _ = require('lodash');

module.exports = function sayHello(to) {
  var compiled = _.template('Hello, <%= name %>!');
  return compiled({ name: to });
};
