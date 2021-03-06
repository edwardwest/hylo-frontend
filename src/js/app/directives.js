var angularModule = angular.module('hyloDirectives', ['ngResource'])

require('./directives/contenteditable')(angularModule)
require('./directives/socialMedia')(angularModule)
require('./directives/seeMore')(angularModule)
require('./directives/embeddedComments')(angularModule)
require('./directives/masonry')(angularModule)
require('./directives/anguvideo')(angularModule)
require('./directives/touchClass')(angularModule)
require('./directives/postCard')(angularModule)
require('./directives/welcomePost')(angularModule)

angularModule
.directive('postEditor', require('./directives/postEditor'))
.directive('inlinePostInput', require('./directives/inlinePostInput'))
.directive('postsToolbar', require('./directives/postsToolbar'))

.directive('responsiveDropdownMenu', function () {
  var margin = 15

  return (scope, element, attrs) => {
    if (document.documentElement.clientWidth > 480) return

    var parent = element.parent()
    var toggle = parent.children()[0]

    toggle.addEventListener('click', function () {
      var left = margin - parent[0].offsetLeft + 'px'
      var width = document.documentElement.clientWidth - 2 * margin + 'px'
      element.css({left: left, width: width})
    })
  }
})

.directive('scrollClass', function ($window) {
  return (scope, element, attrs) => {
    var threshold = Number(attrs.scrollClassThreshold)
    var className = attrs.scrollClass

    angular.element($window).bind('scroll', function () {
      if (this.pageYOffset >= threshold && !element.hasClass(className)) {
        element.addClass(className)
        scope.$apply()
      } else if (this.pageYOffset < threshold && element.hasClass(className)) {
        element.removeClass(className)
        scope.$apply()
      }
    })
  }
})

.directive('animateIf', function ($animate) {
  return (scope, element, attrs) => {
    scope.$watch(attrs.animateIf, val => $animate[val ? 'addClass' : 'removeClass'](element, attrs.animation))
  }
})

// https://gist.github.com/kirkstrobeck/599664399dbc23968741
.directive('autofocus', function ($timeout) {
  return {
    restrict: 'A',
    link: ($scope, $element) => $timeout(() => $element[0].focus())
  }
})

.directive('backImg', function () {
  return (scope, element, attrs) => {
    scope.$watch(attrs.backImg, function (value) {
      if (!value) return
      var style
      if (attrs.backImgGradient) {
        style = format('%s, url(%s)', attrs.backImgGradient, value)
      } else {
        style = format('url(%s)', value)
      }
      element.css({'background-image': style})
    })
  }
})

.directive('hyloUnique', function ($http) {
  return {
    require: 'ngModel',
    link: function (scope, elem, attrs, ctrl) {
      elem.on('blur', function (evt) {
        scope.$apply(function () {
          if (elem.val() === '') return

          // FIXME don't use $http directly
          $http({
            method: 'POST',
            url: '/noo/community/validate',
            data: {
              column: attrs.hyloUnique,
              constraint: 'unique',
              value: elem.val()
            }
          })
          .success(function (data, status, headers, config) {
            ctrl.$setValidity('unique', data.unique)
          })
        })
      })
    }
  }
})

.directive('forceLowercase', function () {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, modelCtrl) {
      var lowercase = function (inputValue) {
        if (inputValue === undefined) inputValue = ''
        var lowercased = inputValue.toLowerCase()
        if (lowercased !== inputValue) {
          modelCtrl.$setViewValue(lowercased)
          modelCtrl.$render()
        }
        return lowercased
      }
      modelCtrl.$parsers.push(lowercase)
      lowercase(scope[attrs.ngModel]) // capitalize initial value
    }
  }
})

.directive('loadingIndicator', () => ({
  template: '<div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
}))

.directive('ngPlaceholder', () => ({
  restrict: 'A',
  scope: {
    placeholder: '=ngPlaceholder'
  },
  link: function (scope, elem, attr) {
    scope.$watch('placeholder', function () {
      elem[0].placeholder = scope.placeholder
    })
  }
}))
