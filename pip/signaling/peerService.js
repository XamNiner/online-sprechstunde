(function() {
'use strict';
    
angular.module('chatApp').service('peerService', function(socket, photoService) {
    //service to encapsulate the RTCP signaling steps
    var vm = this;
    var sender, receiver;
    var pc;
    var remoteVideo;
    var remoteStream;
    
    //configuration file for the peer connection
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
    
    //--------------------------------------------------------------------
    
    vm.beginAnswering = function(localStream, rmStream, rmVideo, initiator, dataChannel) {
        //create new RTCPeerConnection
        remoteStream = rmStream;
        remoteVideo = rmVideo;
        createPeerConnection(initiator, dataChannel);
        pc.addStream(localStream);
        return pc;
    }
    
    vm.answeredRequest = function(localStream, rmStream, rmVideo, data, dataChannel){
        console.log('Client with id - '+data.sender+' answered your call.');
                
        //other peer accepted the request - init new peer connection
        //initiator begin sdp offer
        var offering = {
            sender: data.receiver,
            receiver: data.sender,
            message: 'sdp:offer'
        }
        sender = offering.sender;
        receiver = offering.receiver;
        remoteStream = rmStream;
        remoteVideo = rmVideo;
        callPeer(localStream, offering, dataChannel);  
        return pc;
    }
    
    //--------------------------------------------------------------------
    
    function callPeer(localStream, offering, dataChannel) {
        createPeerConnection(true, dataChannel);
        console.log('<<<<<<<<<<<<<PC '+pc);
        pc.addStream(localStream);
        //create the sdp-offer
        startOffer(offering, pc);
    }    
    
    function createPeerConnection(isInitiator, dataChannel) {
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
                console.log('<<<<<<<<<<<<<<<<<<<<<<DATACHANNEL ' +dataChannel);
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
        photoService.renderPhoto(buf);
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
                photoService.renderPhoto(buf);
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
    
    //--------------------------------------------------------------------
    //RTCP event handler
    //--------------------------------------------------------------------
    
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
    
    function sendMessage(message) {
        console.log('Client sending message: ', message);
        socket.emit('message', message);
    }
    
    //-----------------------------------------------------------------
    //creating and sending sdp-offer
    //-----------------------------------------------------------------
    function startOffer(offering, pc) {
        console.log('Sending offer to peer');
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
            sender: sender,
            receiver: receiver,
            message: sessionDescription.type,
            session: sessionDescription
        }
        socket.emit('sdp', data);
    }
    
    //-----------------------------------------------------------------
    //creating and sending sdp-answer
    //-----------------------------------------------------------------
    //init the client for answering
    vm.prepareAnswer = function(localStream, rmStream, rmVideo, isInitiator, dataChannel) {
        remoteStream = rmStream;
        remoteVideo = rmVideo;
        createPeerConnection(isInitiator, dataChannel);
        pc.addStream(localStream);  
        return pc;
    }
    
    vm.answerPeer = function (sessionDescription) {
        console.log('Sending answer to peer');
        pc.createAnswer().then(
        localAndSendPvtMsg, onCreateSessionDescriptionError);       
    }
    
    //-----------------------------------------------
    vm.getPeerConnection = function() {
        pc = new RTCPeerConnection(pcConfig, sdpConstraints);
        
        //event handler
        pc.onicecandidate = handleIceCandidate;
        pc.onremovestream = handleRemoteStreamRemove;
        return pc;
    }
}) 
})()