(function() {
'use strict';
    
angular.module('chatApp').directive('chatMessageList', function() {
    return {
        scope: {
            list: '=chatMessageList'
        },
        template: '<div class="chat-list js-chat-list">' +
                    '<div ng-repeat="message in list">' +
                        '{{message.text}}' +
                    '</div>' +
                   '</div>',
        link: function(scope, element) {
            scope.$watchCollection('list', function() {
                var $list = $(element).find('.js-chat-list');
                var scrollHeight = $list.prop('scrollHeight');
                $list.animate({scrollTop: scrollHeight}, 500);
            });
        }
    };
})    
    
})()