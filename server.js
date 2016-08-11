'use strict';

// Setup basic express server
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/pip'));
//app.get(‘/’, function (req, res) {
//res.sendfile(__dirname + '/pip/index.html');
//});

// Chatroom - names of all users
var usernames = {};

//peer ids for all users
var peerIds = {};

//available rooms to join
var rooms = [];

//count number of users
var userNumber = 0;
//--------------------------------
//handling of socket events
//--------------------------------
io.on('connection', function (socket) {
    var address = socket.handshake.address;
    var id = 12;
    var praxis = 'pr23';
    
    //logging server events
    function log() {
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }
    
    //client emits add:user to add new user to the room
    socket.on('add:user', function(username) {
        userNumber++;
        console.log('added new user');
        //store the name
        socket.username = username;
        
        //add client name to list of users
        usernames[username] = username;
        io.sockets.emit('update:user', usernames);
        io.sockets.emit('get:pid', peerIds);
        //set the standard room
        var roomAddr = 'room1';
        socket.room = roomAddr;
        
        //join the room
        socket.join(roomAddr);
        
        //send client affirmation message
        socket.emit('update:chat', 'SERVER', 'you have connected to room '+roomAddr);

        //set initial peer id for the new client
        var peerId = praxis+''+socket.username+''+socket.id.substring(2,6);
        peerIds[peerId] = peerId;
        socket.pid = peerId;
        var data = {
            name: username,
            id: peerId,
            pids: peerIds
        }
        socket.emit('init:peerId', data);
    });
    
    //change username
    socket.on('newname:user', function(data) {
        console.log('Changing the name');
        log('The new name: ', data.newName);
        log('The old name: ', data.oldName);
         delete usernames[socket.username];
        usernames[data.newName] = data.newName;
        //set new name for socket
        socket.username = data.newName;
        console.log('Socket name '+socket.username);
        //inform other peers that user changed his name
        socket.broadcast.emit('update:chat', 'SERVER', data.oldName + ' has changed name to '+ socket.username);
        io.sockets.emit('update:user', usernames);
    })
    
    //clients send a new message
    socket.on('send:msg', function(data) {
        //update the chat in the assigned room
        io.sockets.in(socket.room).emit('update:chat', socket.username, data);
        console.log('Send Message: '+JSON.stringify(data));
    });
    
    //sending rtc peer connection messages between peers
    socket.on('message',function(message) {
        //send to all other clients excluding creator
        log('Client send message: ', message);
        socket.broadcast.emit('message', message);
    });
    
    //sending message to a specific socket
    socket.on('private:msg', function(data) {
        if (data.sender) {
            log('The Senders ID - ', data.sender);
            log('The Receivers ID -', data.receiver);
            io.sockets.emit('get:pvtmsg', data);
        } else {
            log('Sending to the room', socket.room);
            socket.broadcast.to(socket.room).emit('msg:room', data);
        }
    });
    
    //handle client disconnect
    socket.on('disconnect', function() {
        log('User disconnected');
        //delete the assigned username from the list of users
        console.log(socket.username + ' has disconnected.');
        delete usernames[socket.username];
        //update username list
        io.sockets.emit('update:user', usernames);
        userNumber--;
        //delete the peer id 
        delete peerIds[socket.pid];
        //update the peer id list
        io.sockets.emit('get:pid', peerIds);
        var msg = 'remove';
        socket.broadcast.to(socket.room).emit('update:member', msg);
        //global text echo that user left
        socket.broadcast.to(socket.room).emit('update:chat', 'SERVER', socket.username + ' has disconnected.');
    });
    
    //change peer id
    socket.on('update:pid', function(pid) {
        log('updating pid');
        //delete old pid
        delete peerIds[socket.pid];
        
        //store the peer id
        socket.pid = pid;
        peerIds[pid] = pid;
        //send new list of peer ids 
        io.sockets.emit('get:pid', peerIds);
    });
    
    //------------------------------
    //testing some functionality
    socket.on('test', function() {
       socket.broadcast.emit('testing'); 
    });
    
    //test for direct connection
    socket.on('sdp', function(data) {
        if (data.sender) {
            log('ENTERED the false one');
            io.sockets.emit('rtc:msg', data);
        } else {
            log('ENTERED the real sdp handler');
            socket.broadcast.to(socket.room).emit('rtc:room', data);
        }
    });
    
    socket.on('check:Id', function(data) {
        log('<<<<<<<ENTERED CHECK ID');
        var join = false,
            failed = false;
        var roomId = data.newId,
            prevRoomId = data.oldId; 
        var msg;
        //check if room Id is already used
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i] === roomId) {
                try {
                  var sockRoom = io.sockets.adapter.rooms[rooms[i]];
                log('The number of users in the room ', sockRoom.length); 
                if(sockRoom.length < 2) {
                    join = true;
                    msg = 'joined';
                } else {
                    failed = true;
                    socket.leave(roomId);
                    msg = 'full';
                }
                break;    
                } catch (e) {
                    log('Error getting number of room users: ', e);
                }
            }
        }
        var data = {
            roomId: roomId,
            userId: socket.id,
            member: 1,
            msg: ''
        }
        if (join) {
            //join an existing room and try to establish peer connection
            log('<<Joining new room', msg);
            data.msg = msg;
            data.member = 2;
            socket.leave(prevRoomId);
            socket.room = roomId;
            socket.join(roomId);
            //send client affirmation message
            socket.emit('update:chat', 'SERVER', 'you have connected to room '+roomId);
            //enter the room
            socket.emit('join:room', data);

            //tell members of the room that a new client has connected
            socket.broadcast.to(roomId).emit('update:chat', 'SERVER', socket.username + ' has connected');
            log('The socket room: ', socket.room);
        } else if(failed){
            //the requested room was full
            data.msg = msg;
            log('Informing user that the room is full', msg);
            socket.emit('join:room', data);
            log('The socket room: ', socket.room);
        } else {
            msg = 'create';
            log('<<Creating new room', msg);
            data.msg = msg;
            data.member = 1;
            socket.leave(prevRoomId);
            
            //create a new room and add it to the list of rooms
            rooms.push(roomId);
            socket.room = roomId;
            socket.join(roomId);
            socket.emit('update:chat', 'SERVER', 'you have connected to room '+roomId);
            var roomnr = io.sockets.adapter.rooms[socket.room];
            var rl = roomnr.length;
            log('number of users in the room', rl);
            socket.emit('join:room', data);
            log('The socket room: ', socket.room);
        }
    });
    
    socket.on('check:room', function(url) {
        log('The old address: ', url);
        var oldRoom = url.substring(29);
        log('The old room: ', oldRoom); 
        var room = io.sockets.adapter.rooms[oldRoom];
        var roomUsers = room.length;
        //clear roomname in rooms array
        var index = rooms.indexOf(oldRoom);
        if (roomUsers === 1) {
            log('DELETE', oldRoom); 
            log('ROOM INDEX', index);
            rooms.splice(index, 1);
        }
        log('User in room: ', roomUsers); 
        //leave the old room before connecting to the new one
        socket.leave(oldRoom);
        socket.broadcast.to(oldRoom).emit('update:chat', 'SERVER', socket.username + ' has switched to another room');
    });
    
    socket.on('send:socketId', function(id) {
        //do send your real  Id
        socket.broadcast.to(socket.room).emit('receive:socketId', id);
    })
});