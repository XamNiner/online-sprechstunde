(function() {
'use strict';
    
angular.module('chatApp').service('utilityService', function(socket) {
    //service providing some utility functions
    var vm = this;
    var fullScreenState = false; 
    
    
    //change the username
    vm.changeName = function(oldName, newName) {
        console.log('Setting new name!')
        var data = {
            oldName: oldName,
            newName: newName
        }
        socket.emit('newname:user', data);
        return newName;
    }
    
    //standard fullscreen video implementation
    vm.goFullScreen = function(video) {
        if (video.requestFullscreen) {
            console.log('Standard Full');
            video.requestFullscreen();
        }
        else if (video.mozRequestFullScreen) {
            console.log('Firefox Full');
            video.mozRequestFullScreen();
        }
        else if (video.webkitRequestFullScreen) {
            console.log('Chrome Full');
            video.webkitRequestFullScreen();
        }
        else if (video.msRequestFullscreen) {
            console.log('MS Full');
            video.msRequestFullscreen();
        }
    }
    
    vm.newFullScreen = function(fsState, localVideo, remoteVideo, localStream, remoteStream) {
        if (fsState) {
            localVideo.src = localStream;
            remoteVideo.src = remoteStream;
        } else {
            localVideo.stop;
            remoteVideo.stop;
        }
        fullScreenState = fsState;
    }
    
    //not used right now
    vm.getFSState= function() {
        return fullScreenState;
    }
    
    //local date and time DD-MM-YYYY-HH:MM:SS 
    vm.createTimeStamp = function() {
        var ndate = new Date();
        var timeStamp = ('0' + ndate.getDate()).slice(-2) + '-' + ('0' + (ndate.getMonth() + 1)).slice(-2) + '-' +  ndate.getFullYear() + '-' + ('0' + ndate.getHours()).slice(-2) + ':' + ('0' + ndate.getMinutes()).slice(-2) + ':' + ('0' + ndate.getSeconds()).slice(-2);
        return timeStamp;
    }
}) 
})()