//Immediately Invoked Function Expression (IIFE)
(function() {
'use strict';

angular.module('chatApp')
.controller('ChatCtrl', function($scope, $routeParams, $location, socket, modalService, photoService, signalingService, peerService) {
    //view model to encapsulate $scope using controllerAs
    var vm = this;
    vm.roomId = $routeParams.roomId;
    console.log('This is the ID: '+vm.roomId+' - '+$routeParams.roomId);
    vm.messages = [];
    vm.message;
    
    //change room after connection
    //socket.on('set:url', function(url) {
      //  console.log('Changing URL to the new room address');
        //$location.url('/room/'+url);
    //});
    
    vm.addMessage = addMessage;
    
   function addMessage() {
        socket.emit('send:msg', vm.message);
        vm.message = '';
    }
    
    //client side implementation
    vm.userNames = [];          //list of usernames
    vm.name = null;             //own name
    var channelReady = false;   //check if localStream is available before calling
    var praxis = 'pr23';        //praxis number to create a peer id
    
    //show warning if no user media found or camera access granted
    vm.noMedia = false;
    vm.noCamera = false;
    //client states
    vm.gumedia = true;      //is client capable of using getUserMedia?
    vm.canCall = false;     //can client call another peer?
    vm.inCall = false;      //is client currently being called?
    vm.pids;                //Peer Ids of all connected clients 
    
    //stream elements to be displayed on the web page
    var localVideo = document.getElementById('localVideo'),
        remoteVideo = document.getElementById('remoteVideo');
    
    //send peer connection request to this id
    vm.peerId;  //id of the object to be called
    vm.ownId;   //set last id numbers yourself 
    vm.setId = praxis+''+vm.name+''+42; //standard
    vm.accepted = false; //has client answered a peer request?
    vm.isCollapsed = true;
    
    //Id of the other peer
    vm.partnerId;
    
    var isChannelReady = false, //is client able to stream media?
        isInitiator = false,    //has client initiated the call?
        isStarted = false;      //is media being streamed to another peer?
    
    var pc,             //p2p connection 
        localStream,    //your own media stream
        remoteStream;   //media stream of the second peer

    var pcConfig = {
      'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
      }]
    };

    // Set up audio and video regardless of what devices are present.
    var sdpConstraints = {
      'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
      } 
    };
    
    //-----------------------------------------------------------------
    //view model functions
    //-----------------------------------------------------------------
    vm.getLocalVideo = getLocalVideo;   //receive local media stream
    vm.makeId = makeId;                 //create your own peer id
    vm.sendRequest = sendRequest;       //request connection with peer
    vm.hangUp = hangUp;                 //end a current call
    //-----------------------------------------------------------------
    //Socket io event handling
    //-----------------------------------------------------------------
    
    //check if getUserMedia is available
    if (navigator.mediaDevices === undefined) {
            vm.noMedia = true;
    }
    
    //ask for username upon connection
    socket.on('connect', function() {
        //prompt user to enter a username
       vm.name = prompt('Enter a username!');
        socket.emit('add:user', vm.name);
    });
    
    //set the initial peer Id
    socket.on('init:peerId', function(data) {
        if (data.name === vm.name) {
            vm.setId = data.id;
            vm.pids = data.pids;
        }  
        socket.emit('update:pid', vm.setId);
    });
    
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
    
    //listen for user changes
    socket.on('update:user', function(uData) {
        vm.userNames = uData;
    });
    
    //show Ids of all connected peers(+ own)
    socket.on('get:pid', function(peerIds) {
        console.log('updating the peer ids');
        vm.pids = peerIds; 
    });
    
    // This client receives a message
    socket.on('message', function(message) {
        console.log('Client received message:', message);
        if (message.type === 'candidate' && isStarted) {
            var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
            });
            pc.addIceCandidate(candidate);
        } else if (message === 'bye' && isStarted) {
            //handleRemoteHangup();
        }
    });
    
    //deal with private messages
    socket.on('get:pvtmsg', function(data) {
        //handle private message exchange between peers
        if (data.receiver === vm.setId) {
            console.log('Got the right client');
            if (data.message === 'request') {
                console.log('>>>>>>>>>>>request start');
                startRequest(data);  
            } else if (data.message === 'answered') {
                //accepted the call request
                answeredRequest(data);
            } else if (data.message === 'denied') {
                console.log('<<<<<<<<<<<request end')
                console.log('Client with id - '+data.sender+' refused the connection.');
                //display refusal
                modalOptions.headerText = 'Client refused your request';
                modalOptions.bodyText = 'Please try again.';
                modalService.showModal({}, modalOptions);
            } else if (data.message === 'in:call') {
                console.log('<<<<<<<<<<<request end');
                console.log('Requested client is in another call!');
                //display warning
                modalOptions.headerText = 'Requested Client is currently in another call';
                modalOptions.bodyText = 'Please try later or call another peer Id.';
                modalService.showModal({}, modalOptions);
            } else if (data.message === 'not:ready') {
                console.log('<<<<<<<<<<<request end');
                console.log('The requested client is not ready to establish a p2p connection.');
                //display warning
                modalOptions.headerText = 'Requested Client is not yet ready for a call';
                modalOptions.bodyText = 'Please try later or call another peer Id.';
                modalService.showModal({}, modalOptions);
            } else if (data.message === 'bye' && isStarted) {
                handleRemoteHangup();
            } else {
                console.log('Received remote message!');
            } 
        }
    });
    
    //rtc handshake
    socket.on('rtc:msg', function(data) {
        //check if correct client
        if (data.receiver === vm.setId) {
            vm.partnerId = data.sender;
            if (data.message === 'offer') {
                console.log('Received a new offer from a peer');
                if (!isInitiator && !isStarted) {
                    prepareAnswer();
                    
                }
                pc.setRemoteDescription(new RTCSessionDescription(data.session));
                answerPeer();
                //peerService.answerPeer();
            } else if (data.session.type === 'answer' && isStarted) {
                console.log('Receiving sdp answer');
                pc.setRemoteDescription(new RTCSessionDescription(data.session));
                console.log('Established connection with peer.');
            }
        }
    });

    //logging the server messages
    socket.on('log', function(array) {
        console.log.apply(console, array);
    });
    
    //-----------------------------------------------------------------
    //change the user name
    //-----------------------------------------------------------------
    vm.newName;
    vm.setName = setName;
    
    function setName() {
        console.log('Setting new name!')
        var oldName = vm.name;
        vm.name = vm.newName;
        var data = {
            oldName: oldName,
            newName: vm.newName
        }
        socket.emit('newname:user', data);
    }
    //-----------------------------------------------------------------
    //sending messages to all clients
    //-----------------------------------------------------------------
    
    //send connection messages
    function sendMessage(message) {
        console.log('Client sending message: ', message);
        socket.emit('message', message);
    }
    //-----------------------------------------------------------------
    //init new local video stream
    //-----------------------------------------------------------------
    
    //function for button click
    function getLocalVideo(){
        receiveLocalVideo();
        //able to take pictures
        vm.canPhoto = true;
    }

    function receiveLocalVideo() {
        if (navigator.mediaDevices.getUserMedia !== 'undefined') {
            //get the video stream
            console.log('getUserMedia active');
            var constraints = { video: true, audio: true };
            navigator.mediaDevices.getUserMedia(constraints)
            .then(createStream)
            .catch(function(e) {
                vm.noCamera = true;
                alert('getUserMedia error: ' + e.name);
            });
            console.log('AFTER STREAM');
            vm.gumedia = false;
            vm.canCall = true;
        } else {
            vm.noMedia = true;
            console.log('getUserMedia is not supported in this browser!');
        }
    }
    
    function createStream(stream){
        console.log('Adding local stream');
        localVideo.src = window.URL.createObjectURL(stream);
        localStream = stream;
        console.log('The local stream has been initialized: '+localStream);
        isChannelReady = true;
    }
    
    //-----------------------------------------------------------------
    //request a new peer connection
    //-----------------------------------------------------------------
    
    //control modal messages
    var modalOptions = {
                closeButtonText: 'Cancel',
                actionButtonText: 'Ok',
                headerText: 'Standard header',
                bodyText: 'Standard body.'
            };
    
    //request a peer connection from another client
    function sendRequest() {
        console.log('sending request to establish peer connection');
        var message = 'request';
        console.log('Check - '+vm.setId+' - '+vm.peerId);
        //dont request yourself!
        if (vm.peerId !== vm.setId) {
            signalingService.sendRequest(vm.setId, vm.peerId, message);
        } else {
            console.log('You requested yourself');
            modalOptions.headerText = 'Alert: Connection with yourself';
            modalOptions.bodyText = 'Please choose another peer Id.';
            modalService.showModal({}, modalOptions);
        }
    }
    
    function startRequest(data) {
        if (isChannelReady && !vm.inCall) {
            modalOptions.headerText = 'Connection request from Peer '+data.sender;
            modalOptions.bodyText = 'Accept peer2peer connection?';
            modalOptions.actionButtonText = 'Accept';
            modalOptions.closeButtonText = 'Decline';
            modalOptions.okResult = 'Accepted';
            modalService.showModal({}, modalOptions).then(function(result) {
                signalingService.handleRequest(data, result);
            });  
        } else if (isChannelReady && vm.inCall){
            console.log('Another peer called while in p2p call Id: '+data.sender);
            var inCall = {
                sender: data.receiver,
                receiver: data.sender,
                message: 'in:call'
            };
            signalingService.sendPrivateMessage(incall);
        } else {
            console.log('Not ready while being called by peer Id: '+data.sender);
            var notReady = {
                sender: data.receiver,
                receiver: data.sender,
                message: 'not:ready'
            }
            signalingService.sendPrivateMessage(notReady);
        }  
    }
    

    
    //-----------------------------------------------------------------
    //begin to establish peer connection
    //-----------------------------------------------------------------
    //init a new peer connection upon receiving an sdp offer
    function beginAnswering() {
        console.log('<<<<<<<<<Begin Answering the SDP Offer');
        console.log('Started: '+isStarted+' LocalStream: '+ localStream +' Channel Ready? '+ isChannelReady);
        if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
            callReady();
            //create new RTCPeerConnection
            pc = peerService.beginAnswering(localStream, remoteStream, remoteVideo, isInitiator, dataChannel);
            isStarted = true;
        } else {
            modalOptions.headerText = 'Alert: Failed to answer SDP offer';
            modalOptions.bodyText = 'Please try again.';
            modalService.showModal({}, modalOptions);
        }
    }
    
    function callReady() {
        vm.canCall = false;
        vm.inCall = true;
        if (vm.picReady) {
            vm.picSendReady = true;
        }    
    }
    
    function answeredRequest(data) {
        console.log('Client with id - '+data.sender+' answered your call.');
                
        //other peer accepted the request - init new peer connection
        //initiator begin sdp offer
        console.log('Begin of new Peer Connection');
       
        var offering = {
            sender: data.receiver,
            receiver: data.sender,
            message: 'sdp:offer'
        }
        callPeer(offering);
    }
    
    function callPeer(data) {
        console.log('Begin of new Peer Connection');
        if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
            //change button access
            callReady();
            //new connection
            isStarted = true;
            isInitiator = true;
            createPeerConnection();
            pc.addStream(localStream);
            
            //create the offer
            startOffer(data);
        }
    }
    
    function createPeerConnection(){
        try {
            console.log('>>>>>> creating peer connection');
            pc = new RTCPeerConnection(pcConfig, sdpConstraints);
            
            //add event handler
            pc.onicecandidate = handleIceCandidate;
            pc.onaddstream = handleRemoteStreamAdded;
            pc.onremovestream = handleRemoteStreamRemove;
            if (isInitiator) {
                console.log('Creating Data Channel');
                dataChannel = pc.createDataChannel('photos');
                onDataChannelCreated(dataChannel);

                console.log('Creating an offer');
            } else {
                pc.ondatachannel = function(event) {
                console.log('ondatachannel:', event.channel);
                dataChannel = event.channel;
                onDataChannelCreated(dataChannel);
              };
            }
        }catch (e) {
            console.log('Failed to create PeerConnection, exception: ' + e.message);
            alert('Cannot create RTCPeerConnection object.');
        }
        return;
    }
    
    //-----------------------------------------------------------------
    //handler for the peer connection
    //-----------------------------------------------------------------
    //add new ice candidates
    function handleIceCandidate(evt) {
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
    
    //add another peers video stream to your browser
    function handleRemoteStreamAdded(evt) {
        console.log('Remote stream added.');
        remoteVideo.src = window.URL.createObjectURL(evt.stream);
        remoteStream = evt.stream;
    }
    
    //delete a remote stream
    function handleRemoteStreamRemove(evt) {
        console.log('Removed a remote stream Event: ', evt);
    }
    
    //problem sending the offer to another peer
    function handleCreateOfferError(evt) {
        console.log('Create SDP-offer error: ', evt);
    }
    
    function onCreateSessionDescriptionError(error){
        console.log('Encountered an error while creating the SessionDescription: ', error);    
    }
    
    //-----------------------------------------------------------------
    //creating and sending sdp-offer
    //-----------------------------------------------------------------
    //offer creation
    function startOffer(data) {
        console.log('Sending offer to peer');
        vm.partnerId = data.receiver;
        pc.createOffer(localAndSendPvtMsg, handleCreateOfferError);
    }
    
     function localAndSendPvtMsg(sessionDescription) {
        console.log('Sending the sesssion description: ', sessionDescription);
        //set the session description locally
        sendRTCMessage(sessionDescription);
        pc.setLocalDescription(sessionDescription);
    }
    
    //create RTC handshake - exchanging sdp
    function sendRTCMessage(sessionDescription) {
        //send the local session description via socketio to the other peer
        var data = {
            sender: vm.setId,
            receiver: vm.partnerId,
            message: sessionDescription.type,
            session: sessionDescription
        }
        socket.emit('sdp', data);
    }
    
    //-----------------------------------------------------------------
    //creating and sending sdp-answer
    //-----------------------------------------------------------------
    //init the client for answering
    function prepareAnswer() {
        console.log('Preparing sdp answer for the caller');
        console.log('Started: '+isStarted+' LocalStream: '+ localStream +' Channel Ready? '+ isChannelReady);
        if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
            console.log('Started Call Answer');
            //change button access - able to hang up on the caller
            callReady();
            //create new RTCPeerConnection
        
            createPeerConnection();
            pc.addStream(localStream);
            isStarted = true;
        }  
    }
    
    //return an sdp answer for the other peers sdp offer        
    function answerPeer(sessionDescription) {
        console.log('Sending answer to peer');
        pc.createAnswer().then(
        localAndSendPvtMsg, onCreateSessionDescriptionError);   
    }  
    
    //-----------------------------------------------------------------
    //ending the currently running call
    //-----------------------------------------------------------------
    
    //stop a running p2p call
    function hangUp() {
        signalingService.hangup(pc, remoteStream, vm.setId, vm.partnerId);
        resetChannelState();
        vm.picSendReady = false;
    };
    
    //the caller has ended the call
    function handleRemoteHangup() {
        signalingService.remoteHangup(pc, remoteStream);  
        resetChannelState();
        console.log('State of the peer connection: '+pc);
    }
    
    function resetChannelState() {
        isStarted = false;
        isInitiator = false;
        vm.canCall = true;
        vm.inCall = false;
        vm.picSendReady = false;   
    }
    
    //end any calls when reloading or closing the page
    window.onbeforeunload = function() {
        var quitData = {
            sender: vm.setId,
            receiver: vm.partnerId,
            message: 'bye'
        }
        signalingService.sendPrivateMessage(quitData);
    }
    
    //-----------------------------------------------------------------
    //capture a picture and send it over the RTC data channel
    //-----------------------------------------------------------------
    var photo = document.getElementById('photo');
    var photoContext = photo.getContext('2d'); 
    //set picture dimensions
    var photoContextW,
        photoContextH;
    
    //the data channel to send byte data through
    var dataChannel;
    
    //picture ready to send
    vm.canPhoto = false;
    vm.picReady = false;
    vm.picSendReady = false;
    vm.snapImg;
    //container holding image data
    vm.imgContainer = [];
    
    vm.snapPhoto = snapPhoto;
    vm.sendPhoto = sendPhoto;
    
    function snapPhoto() {
        vm.snapImg = photoService.snap(localVideo, photo, photoContext);
        vm.picReady = true;
        if (vm.inCall) {
            vm.picSendReady = true;
        }
    }
    
    function sendPhoto() {
        //check if in call and a photo is available
        if (vm.picReady && vm.inCall) {
           photoService.sendPhoto(photo, photoContext, dataChannel);
        }
    }
    //----------------------------------------------------
    //sending specific files from one client to another
    //----------------------------------------------------
    vm.sendFile = sendFile;
    vm.newFile;
    vm.fname;
    vm.transferFile;

    vm.upload = function(event) {
        var files = event.target.files;
        console.log('The new file: '+files[0].size);
        console.log('Name of the data: '+files[0].name);
        vm.fname = files[0].name;
        console.log(vm.fname);
        //update the filename 
        $scope.$digest();
        vm.transferFile = files[0];
    };
    
    //WORK IN PROGRESS
    function sendFile() {
        var CHUNK_LEN = 64000;          //64KB Chunks
        var file = vm.transferFile,     //file to be  transfered
            len = file.size,            //file size
            n = len / CHUNK_LEN | 0;    //number of chunks
        console.log('This is the byte lenght of the file: '+len);
        if (vm.inCall && vm.transferFile.size >= 0) {
           //sending data
            console.log('Sending a file with a length of '+len);
            dataChannel.send(len);
            
            //send individual chunks
            for (var i = 0; i < n; i++) {
                var start = i * CHUNK_LEN,
                    end = (i + 1) * CHUNK_LEN;
                console.log(start+' - '+ (end - 1));
                dataChannel.send(file.subarray(start, end));
            }
            
            //send any rest
            if (len % CHUNK_LEN) {
                console.log('last '+len % CHUNK_LEN+' bytes');
                dataChannel.send(file.subarray(n * CHUNK_LEN));
            }
        }
    } 
     //----------------------------------------------------
    //create the data channel to send images
     //----------------------------------------------------
    function onDataChannelCreated(channel) {
        console.log('Created Data Channel:', channel);

        channel.onopen = function() {
        console.log('CHANNEL has been opened!!!');
        };

        channel.onmessage = (adapter.browserDetails.browser === 'firefox') ?
        receiveDataFirefoxFactory() : receiveDataChromeFactory();
    }
    
    function receiveDataChromeFactory() {
        var buf, count;

        return function onmessage(event) {
        if (typeof event.data === 'string') {
            buf = window.buf = new Uint8ClampedArray(parseInt(event.data));
            count = 0;
            console.log('Expecting a total of ' + buf.byteLength + ' bytes');
            return;
        }

        var data = new Uint8ClampedArray(event.data);
        buf.set(data, count);

        count += data.byteLength;
        console.log('count: ' + count);

        if (count === buf.byteLength) {
        // we're done: all data chunks have been received
        console.log('Done. Rendering photo.');
        renderPhoto(buf);
        }
        };
    }

    function receiveDataFirefoxFactory() {
      var count, total, parts;

      return function onmessage(event) {
        if (typeof event.data === 'string') {
          total = parseInt(event.data);
          parts = [];
          count = 0;
          console.log('Expecting a total of ' + total + ' bytes');
          return;
        }

        parts.push(event.data);
        count += event.data.size;
        console.log('Got ' + event.data.size + ' byte(s), ' + (total - count) +
                    ' to go.');

        if (count === total) {
          console.log('Assembling payload');
          var buf = new Uint8ClampedArray(total);
          var compose = function(i, pos) {
            var reader = new FileReader();
            reader.onload = function() {
              buf.set(new Uint8ClampedArray(this.result), pos);
              if (i + 1 === parts.length) {
                console.log('Done. Rendering photo.');
                renderPhoto(buf);
              } else {
                compose(i + 1, pos + this.result.byteLength);
              }
            };
            reader.readAsArrayBuffer(parts[i]);
          };
          compose(0, 0);
        }
      };
    }
    
    //receiving photo data through the rtc data channel
    function renderPhoto(data) {
        var photoData = photoService.renderPhoto(remoteVideo, photo, data);
         vm.imgContainer.push(photoData);
        //make sure all thumbnails are being rendered on the site
        $scope.$digest();
        console.log('This is the container size: '+vm.imgContainer.length); 
    }
    
    //-------------------------------
    //Utility
    //-------------------------------
    //add your own id suffix
    function makeId() {
        //create an id from praxis number, username and suffix
        //complete version
        vm.setId = praxis+''+vm.name+''+vm.ownId;
        console.log('Setting own id from '+vm.setId+' to '+vm.ownId);
        //send complete peer id to all clients
        socket.emit('update:pid', vm.setId);
    }
})
})();