//Immediately Invoked Function Expression (IIFE)
(function() {
    
'use strict';

//automatically scroll the message box downward
angular.module('chatApp')
.directive('fixBottom', function() {
  return {
    link: function(scope, element, attrs) {
        var scrollBot = function () {
            var target = document.getElementById(attrs.fixBottom);
            //target.scrollTop = target.scrollHeight;
        };
        element[0].addEventListener('submit', scrollBot, false);
        scope.$on('$destroy', function() {
            element.removeEventListener('submit', scrollBot, false);
        });
    }
  };
})
})();