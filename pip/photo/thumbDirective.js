(function() {
'use strict';
    
angular.module('chatApp').directive('thumbDisplay', function() {
    return {
        restrict: 'EA',
        scope: {
            imgSrc: '@',
            time: '@'
        },
        template: [
            '<div class="dropdown thumbs"> ',
            '   <img ng-src="{{imgSrc}}" class="img-responsive thumbnail" width="100" height="100">',
            '   <div class="dropdown-content thumbs-content">',
            '       <img ng-src="{{imgSrc}}" class="img-responsive thumbnail" width="640" height="480">',
            '       <div class="desc">{{time}}</div>',
            '   </div>',
            '</div>'
        ].join(''),
        controller: ['$scope', function($scope) {
            console.log('---Creating new thumbnail---');
        }]
    };
})       
})()