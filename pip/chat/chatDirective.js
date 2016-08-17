(function() {
'use strict';
    
angular.module('chatApp').directive('chatField', function(socket) {
    var controller = function() {
        var vm = this;
        vm.messages = [];
        vm.message;
        
        vm.addMessage = addMessage;
    
        function addMessage() {
            socket.emit('send:msg', vm.message);
            vm.message = '';
        }
        
        //listen for chat updates from the server
    socket.on('update:chat', function(username, data) {
        var msg = {
            sender: username,
            message: data
        };
        //update the chat window scroll bottom
        vm.messages.push(msg);
        //maybe check if user has scrolled somewhere
        updateScroll();
    });
    
    function updateScroll(){
    var element = document.getElementById('chat');
        element.scrollTop = element.scrollHeight;
    }
    };
    
    return {
        restrict: 'EA', //can be used as element or attribute
        scope: {
            //messages: '='
        },
        templateUrl: 'views/chat.html',
        controller: controller,
        controllerAs: 'vm',
        bindToController: true
    };
})    
    
})()