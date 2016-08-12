(function() {
'use strict';
    
angular.module('chatApp').service('utilityService', function(socket) {
    //service providing some utility functions
    var vm = this;
    var state = false; 
    
    //change the username
    vm.changeName = function(oldName, newName) {
        console.log('Setting new name!')
        var data = {
            oldName: oldName,
            newName: newName
        }
        socket.emit('newname:user', data);
    }
}) 
})()