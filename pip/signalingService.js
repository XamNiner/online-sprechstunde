(function() {
'use strict';
    
angular.module('chatApp').service('signalingService', function() {
    //service to encapsulate the RTCP signaling steps
    var vm = this;
    
    //request a connection with another peer
    vm.sendRequest = function(ownId, peerId, message, socket) {
        var data = {
            sender: ownId,
            receiver: peerId,
            message: message
        };
        sendPrivateMessage(socket, data);
        console.log('Value in peerId '+vm.peerId);   
    }
    
    vm.handleRequest = function(data, result, socket) {
        console.log('The result: '+result);
        if (result === 'Accepted') {
            //accepted
            console.log('Accepted the other clients request!');
            //accepting the peers call
            var answer = {
                sender: data.receiver,
                receiver: data.sender,
                message: 'answered'
            };
            //send answer to caller
            sendPrivateMessage(socket, answer);
        } else {
            //refused connection
            console.log('Denied the other clients request!');
            //send refusal back to sender
            var denied = {
                sender: data.receiver,
                receiver: data.sender,
                message: 'denied'
            };
            sendPrivateMessage(socket, denied);
        } 
    }
    
    //message for a specific client
    vm.sendPrivateMessage = sendPrivateMessage;
    
    function sendPrivateMessage(socket, data) {
        console.log('Sender id: '+data.sender+' and Receiver id: '+data.receiver);
        console.log('Sending private message: '+ data.message);
        socket.emit('private:msg', data);    
    }
}) 
})()