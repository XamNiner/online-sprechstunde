(function() {
'use strict';
    
angular.module('chatApp').controller('RoomCtrl', function($rootScope, $scope, $routeParams, $location, socket, peerService, signalingService, modalService, routeService, photoService, utilityService, spinnerService) {
    var vm = this;
    vm.userName;
    vm.newName;
    vm.roomId = $routeParams.roomId;
    vm.oldUrl;
    vm.newUrl;
    vm.canCall = true;          //able to call another peer
    vm.inCall = false;          //currently in call with other peer
    vm.hasPeerToCall = false;   //another peer in the room to call
    vm.waitAnswer = false;      //awaiting answer to request
    vm.fs = false;              //fullscreen mode
    var roomId = $routeParams.roomId,
        currentRoom = 'room1';
    
    //IDs for client and his peer
    vm.peerId;
    vm.clientId;
    
    //check for getUserMedia and camera access
    vm.gumedia = true;
    vm.noMedia = false;
    vm.noCamera = false;
    
    var data = {
        newId: roomId,
        oldId: currentRoom
    }
    
    var localVideoR = document.getElementById('localVideoR'),
        localFSVideo= document.getElementById('localFSVideo'),
        remoteVideoR = document.getElementById('remoteVideoR'),
        remoteFSVideo= document.getElementById('remoteFSVideo'),
        localStream,
        remoteStream;
    
    var isStarted = false,      //connection has been started
        isInitiator = false,    //initiated the RTC call
        roomMember = 0,         //number of people in the room
        owner = false,          //creator of the room
        pc = null;              //RTC peer connection object
    
    //----------------------------------------------------------
    
    vm.startPeerConnection = startPeerConnection;   //re-initialize a call
    vm.hangUp = hangUp;                             //hang up on an active call
    vm.setName = setName;                           //change chat username
    vm.goFullScreen = goFullScreen;                 //set remote video to fullscreen
    
    //change the chat name
    function setName() {
       vm.userName = utilityService.changeName(vm.userName, vm.newName);    
    }
    
    function goFullScreen(fs){
        console.log('Going fullScreen');
        //standard fullscreen video option
        //utilityService.goFullScreen(remoteVideoR);
        
        //custom fullscreen with navbar on top
        if (fs) {
            vm.fs = false;
            utilityService.newFullScreen(vm.fs, localFSVideo, remoteFSVideo);
        }else {
            vm.fs = true;
            var ls = window.URL.createObjectURL(localStream),
                rs = window.URL.createObjectURL(remoteStream);
            utilityService.newFullScreen(vm.fs, localFSVideo, remoteFSVideo, ls, rs);
        }
    }
    
    //display information panel
    var modalOptions = {
                closeButtonText: 'Abbruch',
                actionButtonText: 'Ok',
                headerText: 'Standard header',
                bodyText: 'Standard body.'
        };
    
    function initLocalVid() {
        try {
            //get the video stream
            console.log('getUserMedia active');
            //video resolutions and audio  
            
            var constraints = {
                    audio: true,
                    video: {
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 },
                        facingMode: 'user'
                    }
                }
            navigator.mediaDevices.getUserMedia(constraints)
            .then(createStream)
            .catch(function(e) {
                vm.noCamera = true;
                alert('getUserMedia error: ' + e.name);
            });
            console.log('AFTER STREAM');
            vm.gumedia = false;
        } catch (error) {
            vm.noMedia = true;
            console.log('getUserMedia is not supported in this browser!');
        }
    };
    
    initLocalVid();   
    
    function createStream(stream){
        console.log('Adding local stream');
        localVideoR.src = window.URL.createObjectURL(stream);
        localStream = stream;
        //check availability of room Id
        socket.emit('check:Id', data);
        vm.canPhoto = true;
    }
    
    //answer to the check
    socket.on('join:room', function(data) {
        vm.userName = data.name;
        roomMember = data.member;
        vm.clientId = data.userId;
        if(data.msg === 'full') {
            console.log('Sorry the room is already at maximum capacity');
            modalOptions.headerText = 'Raum: Voll';
            modalOptions.bodyText = 'Bitte versuchen Sie es noch einmal oder wählen Sie einen anderen Raum.';
            modalService.showModal({}, modalOptions);
        } else if (data.msg === 'joined') {
            console.log('Preparing to establish a new peer connection');
            vm.currentRoom = data.roomId;
            //init a new peer connection with the other member
            console.log('This is your ID '+vm.clientId);
            socket.emit('send:socketId', vm.clientId);
            startPeerConnection();
        } else if(data.msg === 'create') {
            console.log('<<<<<<<<<<<<<<CREATING the room');
            vm.currentRoom = data.roomId;
            console.log('This is your room '+vm.currentRoom);
            console.log('This is your ID '+vm.clientId);
            owner = true;
        }
        vm.count++;
    });
    
     socket.on('message', function(message) {
        console.log('Client received message:', message);
        if (message.type === 'candidate' && isStarted) {
            var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
            });
            pc.addIceCandidate(candidate);
        }
    });
    
    socket.on('receive:socketId', function(id) {
        console.log('Got Id from your peer'+id);    
        vm.peerId = id;
        if (owner) {
           // socket.emit('send:socketId', vm.clientId);
        }
    });
    
    socket.on('msg:room', function(msg) {
        console.log('Got the following message: '+msg);
         if (msg === 'request') {
            console.log('received a request'); 
            modalOptions.headerText = 'Verbindungsanfrage von einem Nutzer';
            modalOptions.bodyText = 'Möchten Sie eine Verbindung zu diesem Nutzer herstellen?';
            modalOptions.actionButtonText = 'Ja';
            modalOptions.closeButtonText = 'Nein';
            modalOptions.okResult = 'Accepted';
            modalService.close(); 
            modalService.showModal({}, modalOptions).then(function(result) {
                signalingService.handleRequest2(result);
                if (result === 'Accepted') {
                    vm.hasPeerToCall = false;
                } else {
                  vm.hasPeerToCall = true;  
                }
            });
         } else if(msg === 'answered') {
             callPeer();
             vm.connectStatus = false;
             vm.hasPeerToCall = false;
             vm.waitAnswer= false;
         } else if (msg === 'denied') {
            console.log('Client with id - '+data.sender+' refused the connection.');
            //display refusal
            modalOptions.headerText = 'Nutzer hat ihre Anfrage abgelehnt';
            modalOptions.bodyText = 'Bitte versuchen Sie es erneut.';
            modalService.showModal({}, modalOptions);
            vm.hasPeerToCall = true;
            vm.waitAnswer= false;
         } else if(msg === 'bye' && isStarted) {
             console.log('Init remote hangup>>>>>>');
             pc = signalingService.remoteHangup(pc, remoteStream, remoteVideoR);
             resetChannelState();
             remoteVideoR.src = '';
         } else if (msg === 'quit') {
             if(isStarted) {
               console.log('Quit remote hangup>>>>>');
                pc = signalingService.remoteHangup(pc, remoteStream, remoteVideoR);
                resetChannelState();
                remoteVideoR.src = '';  
             }
             vm.hasPeerToCall = false;
         }
    });
    
    socket.on('rtc:room', function(data) {
        var remDesc = new RTCSessionDescription(data.session);
        if (data.message === 'offer') {
            console.log('Received a new offer from a peer');
            if (!isInitiator && !isStarted) {
                prepareAnswer();  
                pc.setRemoteDescription(remDesc).then(answerPeer);
            }
        } else if (data.session.type === 'answer' && isStarted) {
            console.log('Receiving sdp answer');
            pc.setRemoteDescription(remDesc);
            console.log('Established connection with peer.');
        }
    });
    
    function callPeer() {
        //new connection
        isStarted = true;
        isInitiator = true;
        vm.inCall = true;
        vm.canCall = false;
        pc = peerService.getPeerConnection();
        pc.onaddstream = handleRemoteStreamAdded;
        pc.addStream(localStream);
        pc.onsignalingstatechange = handleSignalingState;    
        startDataChannel();
            
        //promise based sdp-offer handling
        pc.createOffer().then(function(offer) {
            //set the session description
            return pc.setLocalDescription(offer)
        })
        .then(function() {
            //send offer to the other peer
            sendRTCMessage(pc.localDescription);
        }).catch(function(error) {
            //catch any errors during offer creation
            console.log('Error while creating sdp-offer: '+error.name);
        });
    }
    
    //check state the pc is in
    function handleSignalingState(event) {
        console.log("<<<<<<<<<<<< onSignalingStateChange", event);
        console.log('<<<<Entered a new state: '+pc.signalingState);
        var state = pc.signalingState;
        if(state === 'have-local-offer') {
            console.log('The local session description '+pc.localDescription);
        } else if(state === 'have-remote-offer') {
            console.log('<<Received Remote Offer>>');
        } else if(state === 'have-local-pranswer') {
            console.log('<<Have Local Answer>>');
        } else if(state === 'have-remote-pranswer') {
            console.log('<<Received Remote Answer from Peer>>');
        }
    }
    
    function prepareAnswer() {
        console.log('Preparing sdp answer for the caller');
        console.log('Started Call Answer');
        vm.inCall = true;
        vm.canCall = false;
        //create new RTCPeerConnection
        pc = peerService.getPeerConnection();
        pc.onaddstream = handleRemoteStreamAdded;
        pc.addStream(localStream);
        startDataChannel();
        isStarted = true;
    }
    
    function startDataChannel() {
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
    }
    
    function answerPeer() {
        console.log('Sending answer to peer'); 
        pc.createAnswer().then(function(answer) {
            //callee sets local answer and informs caller
            return pc.setLocalDescription(answer);
        })
        .then(function() {
            //send answer to the other peer
            sendRTCMessage(pc.localDescription);    
        }).catch( function(error) {
           console.log('Error while creating sdp-answer: '+error.name); 
        });
    } 
    
    //add another peers video stream to your browser
    function handleRemoteStreamAdded(evt) {
        console.log('Remote stream added.');
        remoteVideoR.src = window.URL.createObjectURL(evt.stream);
        remoteStream = evt.stream;
    }
    
    function startPeerConnection() {
        vm.connectStatus = true;
        var message = 'request';
        vm.waitAnswer= true;
        signalingService.sendRequest2(message);
    }
    
    function sendRTCMessage(sessionDescription) {
        var data = {
            message: sessionDescription.type,
            session: sessionDescription
        }
        socket.emit('sdp', data);
    }
    
    //------------------------------------------------
    //Hang up on a running call
    //------------------------------------------------
    //stop a running p2p call
    function hangUp() {
        pc = signalingService.hangup(pc, remoteStream, remoteVideoR);
        resetChannelState();
    };
    
    //return room to original state
    function resetChannelState() {
        isStarted = false;
        isInitiator = false;
        vm.canCall = true;
        vm.inCall = false;
        vm.picSendReady = false; 
        vm.hasPeerToCall = true;
        vm.waitAnswer= false;
        vm.fs = false;
    }
    
    //end any calls when reloading or closing the page
    window.onbeforeunload = function() {
        var message = 'quit';
        signalingService.sendPrivateMessage(message);
    }
    
    //-----------------------------------------------------------------
    //capture a picture and send it over the RTC data channel
    //-----------------------------------------------------------------
    
    var photo = document.getElementById('photo');
    var photoBackup = document.getElementById('photoBackup');
    var photoContext = photo.getContext('2d'); 
    var phCo = photoBackup.getContext('2d');
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
        vm.snapImg = photoService.snap(localVideoR, photoBackup, phCo);
        vm.picReady = true;
        if (vm.inCall) {
            vm.picSendReady = true;
        }
    }
    
    function sendPhoto() {
        //check if in call and a photo is available
        if (vm.picReady && vm.inCall) {
            photoService.sendPhoto(photoBackup, phCo, dataChannel);
        }
    }
    
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
        var photoData = photoService.renderPhoto(remoteVideoR, photo, data);
         vm.imgContainer.push(photoData);
        //make sure all thumbnails are being rendered on the site
        $scope.$digest();
        console.log('This is the container size: '+vm.imgContainer.length); 
    }
    
    //------------------------------------------------
    //Listen for url changes
    //------------------------------------------------
    $scope.$on('$locationChangeStart', roomChange);
    
    function roomChange(event, newUrl, oldUrl){
        console.log('<<<Changed the room');
        socket.emit('check:room', oldUrl);
        vm.oldUrl = oldUrl;
        vm.newUrl = newUrl;
        if(pc !== null) {
            //end the peers current call - disable call button for callee
            console.log('This is the pc: '+pc);
            hangUp();
            signalingService.sendPrivateMessage('quit');
        }
        socket.removeAllListeners();
    }
    
    //stop all socket listeners manually
    $scope.$on('$destroy', function() {
        //socket.removeAllListeners();
    });
})    
    
})()    