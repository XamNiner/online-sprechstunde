//Immediately Invoked Function Expression (IIFE)
(function() {
'use strict';

angular.module('chatApp')
.directive('modalShow', function ($parse) {
    return {
        restrict: "A",
        link: function(scope, element, attrs) {
            //show or hide the modal
            scope.showModal = function(visible, elem) {
                if(!elem) {
                    elem = element;
                }
                if(visible) {
                    $(elem).modal('show');
                } else {
                    $(elem).modal('hide');
                }
            }
                
            //Watch for changes to the modal
            scope.$watch(attrs.modalShow, function(newVal, oldVal) {
                scope.showModal(newVal, attrs.$$element)
            });
                
            //update visibility when modal is closed through dialog
            $(element).bind('hide.bs.modal', function() {
                $parse(attrs.modalShow).assign(scope, false);
                if(!scope.$$phase && !scope.$root.$$phase) {
                    scope.$apply();
                }
            });
        }
    };
})
})();