module.exports = function (config) {
  config.set({
    frameworks: ['browserify', 'jasmine'],
    files: ['src/**/*.js', 'test/**/*_spec.js'],
    preprocessors: {
      'test/**/*.js': ['browserify'],
      'src/**/*.js': [ 'browserify']
    },
    browsers: ['PhantomJS', 'Chrome'],
    customLaunchers: {
      ChromeDebugging: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9222'],
        debug: true,
      }
    },
    browserify: {
      debug: true
    },
    bundleDelay: 2000
  });
};
