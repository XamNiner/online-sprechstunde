//Immediately Invoked Function Expression (IIFE)
(function() {
'use strict';

angular.module('chatApp')
.controller('ChatCtrl', function($scope) {
    var socket = io();
      var el = document.getElementById('server-time');
      socket.on('time', function(timeString) {
        el.innerHTML = 'Server time: ' + timeString;
      });
})
})();