//Immediately Invoked Function Expression (IIFE)
(function() {
    
'use strict';

//automatically scroll the message box downward
angular.module('chatApp')
.directive('customOnChange', function() {
  return {
      restrict: 'A',
    link: function(scope, element, attrs) {
        var onChangeHandler = scope.$eval(attrs.customOnChange);
        element.bind('change', onChangeHandler);
    }
  };
})
})();