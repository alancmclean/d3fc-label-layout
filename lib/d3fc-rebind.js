(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.fc_rebind = global.fc_rebind || {})));
}(this, function (exports) { 'use strict';

  var regexify = (function (strsOrRegexes) {
      return strsOrRegexes.map(function (strOrRegex) {
          return typeof strOrRegex === 'string' ? new RegExp('^' + strOrRegex + '$') : strOrRegex;
      });
  })

  var include = (function () {
      for (var _len = arguments.length, inclusions = Array(_len), _key = 0; _key < _len; _key++) {
          inclusions[_key] = arguments[_key];
      }

      inclusions = regexify(inclusions);
      return function (name) {
          return inclusions.some(function (inclusion) {
              return inclusion.test(name);
          }) && name;
      };
  })

  var createTransform = function createTransform(transforms) {
      return function (name) {
          return transforms.reduce(function (name, fn) {
              return name && fn(name);
          }, name);
      };
  };

  var createReboundMethod = function createReboundMethod(target, source, name) {
      var method = source[name];
      if (typeof method !== 'function') {
          throw new Error('Attempt to rebind ' + name + ' which isn\'t a function on the source object');
      }
      return function () {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
          }

          var value = method.apply(source, args);
          return value === source ? target : value;
      };
  };

  var rebindAll = (function (target, source) {
      for (var _len2 = arguments.length, transforms = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
          transforms[_key2 - 2] = arguments[_key2];
      }

      var transform = createTransform(transforms);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
          for (var _iterator = Object.keys(source)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var name = _step.value;

              var result = transform(name);
              if (result) {
                  target[result] = createReboundMethod(target, source, name);
              }
          }
      } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
      } finally {
          try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
              }
          } finally {
              if (_didIteratorError) {
                  throw _iteratorError;
              }
          }
      }
  })

  var rebind = (function (target, source) {
      for (var _len = arguments.length, names = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          names[_key - 2] = arguments[_key];
      }

      return rebindAll(target, source, include.apply(undefined, names));
  })

  var exclude = (function () {
      for (var _len = arguments.length, exclusions = Array(_len), _key = 0; _key < _len; _key++) {
          exclusions[_key] = arguments[_key];
      }

      exclusions = regexify(exclusions);
      return function (name) {
          return exclusions.every(function (exclusion) {
              return !exclusion.test(name);
          }) && name;
      };
  })

  var map = (function (mappings) {
    return function (name) {
      return mappings[name];
    };
  })

  var capitalizeFirstLetter = function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
  };

  var prefix = (function (str) {
    return function (name) {
      return str + capitalizeFirstLetter(name);
    };
  })

  exports.rebind = rebind;
  exports.rebindAll = rebindAll;
  exports.exclude = exclude;
  exports.include = include;
  exports.map = map;
  exports.prefix = prefix;

}));