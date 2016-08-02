(function() {
'use strict';
    
angular.module('chatApp').directive('testDir', function() {
    var controller = function() {
        
    }
    
    return {
        restrict: 'EA', //can be used as element or attribute
        scope: {
            name: '='
        },
        controller: controller,
        controllerAs: 'vm',
        bindToController: true,
        template: '<div><input ng-model="vm.name"></div>'
    };
})       
})()