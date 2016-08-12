(function() {
'use strict';
    
angular.module('chatApp').service('signalingService', function(socket) {
    //service to encapsulate the RTCP signaling steps
    var vm = this;
    
    /**
     * Sends request to another peer.
     *
     */
    vm.sendRequest = function(ownId, peerId, message) {
        var data = {
            sender: ownId,
            receiver: peerId,
            message: message
        };
        sendPrivateMessage(data);
        console.log('Value in peerId '+vm.peerId);   
    }
    
    //answer request of another peer
    vm.handleRequest = function(data, result) {
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
            sendPrivateMessage(answer);
        } else {
            //refused connection
            console.log('Denied the other clients request!');
            //send refusal back to sender
            var denied = {
                sender: data.receiver,
                receiver: data.sender,
                message: 'denied'
            };
            sendPrivateMessage(denied);
        } 
    }
    
    //end a call between two peers
    vm.hangup = function(pc, remoteStream, remoteVideo, senderId, receiverId){
        console.log('Stopping the currently running call');
        pc = stopping(pc, remoteStream, remoteVideo);
        //disable hangup allow calling again
        if(senderId) {
            console.log('<<<<<<<Entered the sender loop>>>>');
            var quitData = {
            sender: senderId,
            receiver: receiverId,
            message: 'bye'
            }
            sendPrivateMessage(quitData);
        } else {
            console.log('Correct loop>>>>>>>>>>>>>>>>>>>>>>');
            var message = 'bye';
            socket.emit('private:msg', message);
        }
        return pc;
    }
    
    //the other peer left 
    vm.remoteHangup = function(pc, remoteStream, remoteVideo) {
        console.log('Caller has ended the call');
        pc = stopping(pc, remoteStream, remoteVideo);  
        return pc;
    }
    
    //message for a specific client
    vm.sendPrivateMessage = sendPrivateMessage;
    
    function sendPrivateMessage(data) {
        console.log('Sender id: '+data.sender+' and Receiver id: '+data.receiver);
        console.log('Sending private message: '+ data.message);
        socket.emit('private:msg', data);    
    }
    
    //end the call - stop the peer connection
    function stopping(pc, remoteStream, remoteVideo) {
        console.log('Stopping peer connection');
        //check if tracks are available
        try {
            remoteVideo.src = '';
            console.log('removing audio and video>>>>>>>>');
            remoteStream.getVideoTracks()[0].stop(); 
            remoteStream.getAudioTracks()[0].stop(); 
        }catch (e) {
            console.log('Error closing the stream tracks '+e);
        }
        pc.close;
        pc = null; 
        return pc;
    }
    
    //TEST--
     vm.sendRequest2 = function(message) {
        socket.emit('private:msg', message);  
    }
     
    vm.handleRequest2 = function(result) {
        console.log('Answered the other clients request! '+result);
        var message = 'Unanswered';
        //accepting the peers call
        if (result === 'Accepted') {
            message = 'answered';
        } else {
            message = 'denied';
        }
        //send answer to caller
        socket.emit('private:msg', message); 
    }
}) 
})()