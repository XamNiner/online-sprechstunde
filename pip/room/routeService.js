(function() {
'use strict';
    
angular.module('chatApp').service('routeService', function(socket) {
    //service to encapsulate the RTCP signaling steps
    var vm = this;
    var state = false; 
    
    vm.getReadyState = function() {
        return state;
    }
    
    vm.setReadyState = function(st) {
        state = st;
    }
}) 
})()