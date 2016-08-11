(function() {
'use strict';
    
angular.module('chatApp').directive('thumbDisplay', function() {
    var controller = function() {
        var vm = this;
        console.log('<<<<<<<<<<<DIRECTIVE THUMBNAILS');
        console.log('Container content: '+vm.imgContainer);
    }
    
    return {
        restrict: 'EA', //can be used as element or attribute
        scope: {
            imgContainer: '='
        },
        controller: controller,
        controllerAs: 'vm',
        bindToController: true,
        templateUrl: '/views/thumbnails.html'    
    };
})       
})()