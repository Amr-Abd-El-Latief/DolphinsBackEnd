var app = angular.module('app', []);

app.controller('mainController', ['$scope', '$http', function($scope, $http) {
    $scope.searchParams = {};
    $scope.isSearchResults = false;
    
    $scope.searchDB = function() {
        //Using Mocked Data
        /*$http.get('./json/mockedData.json')
        .then(function (result) {            
            console.log(result);
            $scope.searchResults = result.Datata;
            $scope.isSearchResults = true;            
        });*/
        
        //Using Backend DB
        $http.post('https://dolphinsbackend.mybluemix.net/imagesQuery')
        .then(function(result) {
            $scope.searchResults = result;
            $scope.isSearchResults = true;  
        }, function(error) {
            console.log("Error: " + error);
        });
    };
}]);