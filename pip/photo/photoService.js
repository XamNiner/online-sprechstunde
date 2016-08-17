(function() {
'use strict';
    
angular.module('chatApp').service('photoService', function(utilityService) {
    var vm = this;
    
    //snap a picture of your own camera
    vm.snap = function(localVideo, photo, photoContext) {
      adjustCanvasSize(localVideo, photo, photoContext);
        photoContext.drawImage(localVideo, 0, 0, photo.width, photo.height);
        var url = photo.toDataURL();
        return url;
    }  
    
    //send photo to the connected peer
    vm.sendPhoto = function(photo, photoContext, dataChannel) {
        //split data in 64KB chunks
        var CHUNK_LEN = 64000;
        var img = photoContext.getImageData(0, 0, photo.width, photo.height),
            len = img.data.byteLength,  //number of bytes to send
            n = len / CHUNK_LEN | 0;    //number of chunks
            
            console.log('Sending a total of '+len+' bytes');
            //send image data
            dataChannel.send(len);
            
            //send individual chunks
            for (var i = 0; i < n; i++) {
                var start = i * CHUNK_LEN,
                    end = (i + 1) * CHUNK_LEN;
                console.log(start+' - '+ (end - 1));
                dataChannel.send(img.data.subarray(start, end));
            }
            
            //send any rest
            if (len % CHUNK_LEN) {
                console.log('last '+len % CHUNK_LEN+' bytes');
                dataChannel.send(img.data.subarray(n * CHUNK_LEN));
            }    
    }
    
    vm.renderPhoto = function(remoteVideo, photo, data) {
        adjustCanvasSize(remoteVideo, photo);
        var canvas = document.createElement('canvas');
        canvas.width = photo.width;
        canvas.height = photo.height;
        canvas.classList.add('incomingPhoto');
        var context = canvas.getContext('2d');
        var img = context.createImageData(photo.width, photo.height);
        console.log('This is the image data '+data.length);
        img.data.set(data);
        context.putImageData(img, 0, 0);
        
        //display all transfered images as thumbnails with attached time codes
        var urls = canvas.toDataURL(),
            timeStamp = utilityService.createTimeStamp();
            data = {
                url: urls,
                time: timeStamp
            }
        return data;   
    }
    
    //change the canvas size to video proportions
    function adjustCanvasSize(video, photo) {
        var h = video.videoHeight;
        var w = video.videoWidth;
        photo.width = w;
        photo.height = h;
        console.log('Height '+h+' Width '+w); 
    }
    
}) 
})()