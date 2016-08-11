(function() {
'use strict';
    
angular.module('chatApp').service('Room', function($scope, $q) {
    //service to encapsulate the RTCP signaling steps
    var vm = this;
    var stream;     //local video
    
    //STUN server for the connection to exchange ip addresses
    var pcConfig = {
        'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
      }]
    }
    
    function getPeerConnection(id) {
        var pc = new RTCPeerConnection(pcConfig);
        pc.addStream(stream);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        return pc;
    }
    
    function handleIceCandidate(event) {
        console.log('New ICE candidate: ', evt);
        
        if(evt.candidate) {
            sendMessage({
                type: 'candidate',
                label: evt.candidate.sdpMLineIndex,
                id: evt.candidate.sdpMid,
                candidate: evt.candidate.candidate
            });
        } else {
            console.log('End of candidates');
        }    
    }
    
    function handleRemoteStreamAdded(evt) {
        console.log('Remote stream added.');
        remoteVideo.src = window.URL.createObjectURL(evt.stream);
        remoteStream = evt.stream;
    }
    
    function handleRemoteStreamRemoved(event) {
        console.log('removing stream>>>>>>>>>');
    }
    
    function sendMessage(message) {
        console.log('Client sending message: ', message);
        socket.emit('message', message);
    }
}) 
})()