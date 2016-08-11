(function() {
'use strict';
    
angular.module('chatApp').controller('MainCtrl', function($scope, $routeParams, $location, socket, modalService, photoService, signalingService, peerService) {
    var vm = this;
    vm.name;
    vm.roomId = $routeParams.roomId;
    vm.check = 'TESTVal';
    
    if(vm.roomId != 'undefined') {
        console.log('Have to hide the extra chat!>>>>>>>>>>>>');
    }
    
    //ask for username upon connection
    socket.on('connect', function() {
        //prompt user to enter a username
       vm.name = prompt('Enter a username!');
        socket.emit('add:user', vm.name);
    });
    
    //logging the server messages
    socket.on('log', function(array) {
        console.log.apply(console, array);
    });
    
    $scope.$on('$locationChangeStart', roomChange);
    
    function roomChange(event, newUrl, oldUrl){
        if ($routeParams.roomId !== 'undefined') {
            console.log('<<<Dont show chat anymore');  
        }
    }
})    
    
})()    