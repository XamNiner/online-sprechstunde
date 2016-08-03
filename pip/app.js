'use strict';

/**
 * @ngdoc overview
 * @name chatApp
 * @description
 * # chatApp
 *
 * Main module of the application.
 */
angular
    .module('chatApp', ['ui.bootstrap','ngRoute'
    ])

    .config(['$routeProvider', 
        function($routeProvider) {
        $routeProvider
            .when('/room/:roomId', {
                templateUrl: 'views/room.html',
                controller: 'ChatCtrl'
            })
            .otherwise({
            redirectTo: '/'
        });
    }]);


