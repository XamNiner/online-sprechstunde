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
    .module('chatApp', ['ui.bootstrap','ngRoute'])

    .config(['$routeProvider', '$locationProvider', 
        function($routeProvider,$locationProvider) {
        //$locationProvider.html5Mode(true);
        $routeProvider
            .when('/room/:roomId', {
                templateUrl: 'views/room.html',
                controller: 'RoomCtrl',
                controllerAs: 'room'
            })
            .when('/idConnect', {
            templateUrl: 'views/idConnect.html',
            controller: 'ChatCtrl',
            controllerAs: 'chat'
            })
            .otherwise({
            redirectTo: '/home'
        });
    }]);


