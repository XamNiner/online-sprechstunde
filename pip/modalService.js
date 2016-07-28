(function() {
'use strict';
    
angular.module('chatApp').service('modalService', ['$uibModal', 
    function($uibModal) {
        //displaying modals using ui.bootstrap
        var modalDefaults = {
            backdrop: true,
            keyboard: true,
            modalFade: true,
            templateUrl: '/views/modal.html'
        };
        
        //standard description for modal parts
        var modalOptions = {
            closeButtonText: 'Close',
            actionButtonText: 'OK',
            headerText: 'Header',
            bodyText: 'Body',
            okResult:'ok',
            cancelResult: 'cancel'
        };
        
        //set special descriptions
        this.showModal = function(customModalDefaults, customModalOptions) {
            if (!customModalDefaults) {
                customModalDefaults = {};
            }
            customModalDefaults.backdrop = 'static';
            return this.show(customModalDefaults, customModalOptions);
        };
        
        this.show = function(customModalDefaults, customModalOptions) {
            var tempModalDefaults = {};
            var tempModalOptions = {};
            
            angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);
            
            //map modal.html custom properties to those defined in this service
            angular.extend(tempModalOptions, modalOptions, customModalOptions);
            
            if(!tempModalDefaults.controller) {
                tempModalDefaults.controller = function($scope, $uibModalInstance) {
                    $scope.modalOptions = tempModalOptions;
                    $scope.modalOptions.ok = function(result) {
                        $uibModalInstance.close(tempModalOptions.okResult);
                    };
                    $scope.modalOptions.close = function(result) {
                        $uibModalInstance.close(tempModalOptions.cancelResult);
                        $uibModalInstance.dismiss('cancel');
                    };
                }
            }
            return $uibModal.open(tempModalDefaults).result;
        };
    }])
})()