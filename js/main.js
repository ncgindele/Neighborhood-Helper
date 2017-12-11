var baseIconUrl = 'https://maps.google.com/mapfiles/kml/shapes/'
var queries = {'restaurants':{'name': 'restaurants', 'icon': {'url': baseIconUrl + 'dining.png', 'scaledSize': new google.maps.Size(40, 40)}, 'type': 'restaurant', 'keyword': false},
'grocery': {'name': 'grocery', 'icon': {'url': baseIconUrl + 'grocery.png', 'scaledSize': new google.maps.Size(40, 40)}, 'type': 'supermarket', 'keyword': false},
'parks': {'name': 'parks', 'icon': {'url': baseIconUrl + 'parks.png', 'scaledSize': new google.maps.Size(40, 40)}, 'type': 'park', 'keyword': false},
'schools': {'name': 'schools', 'icon': {'url': baseIconUrl + 'schools.png', 'scaledSize': new google.maps.Size(40, 40)}, 'type': 'school', 'keyword': false},
'user': {'name': 'user', 'icon': {'url': 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png', 'scaledSize': new google.maps.Size(40, 40)}, 'type': false, 'keyword': false}
};
var queryTypes = ['grocery', 'restaurants', 'parks', 'schools', 'user'];

$(function () {
    var NeighborhoodViewModel = function() {
        var self = this;
        self.address = ko.observable("394 Bonnie Brae Ave, Rochester NY");
        self.grocery = ko.observable(false);
        self.markers = {'address': [], 'grocery': [], 'restaurants': [], 'parks': [], 'schools': [], 'user': []};
        self.resultList = ko.observableArray();
        self.removeResult = function (placeID) {
            self.resultList.remove(function(result) {
                return result.place_id == placeID;
            });
        };
        self.userFilter = ko.observable('');
        self.filteredResultList = ko.computed(function() {
            if (self.resultList().length > 0){
                return self.resultList().filter(result => result.name.includes(self.userFilter()));
            } else {
                return [];
            }
        }, this);

        self.grocery.subscribe(function() {
            if (self.grocery()) {
                self.executeQuery(queries.grocery);
            } else {
                self.deleteMarkers(queries.grocery.name);
            }
        }, this);
        self.restaurants = ko.observable(false);
        self.restaurants.subscribe(function() {
            if (self.restaurants()) {
                self.executeQuery(queries.restaurants);
            } else {
                self.deleteMarkers(queries.restaurants.name);
            }
        }, this);
        self.parks = ko.observable(false);
        self.parks.subscribe(function() {
            if (self.parks()) {
                self.executeQuery(queries.parks);
            } else {
                self.deleteMarkers(queries.parks.name);
            }
        }, this);
        self.schools = ko.observable(false);
        self.schools.subscribe(function() {
            if (self.schools()) {
                self.executeQuery(queries.schools);
            } else {
                self.deleteMarkers(queries.schools.name);
            }
        }, this);
        self.userCheck = ko.observable(false);
        self.userQuery = ko.observable();
        self.userCheck.subscribe(function() {
            if (self.userQuery() && self.userCheck()) {
                queries.user.keyword = self.userQuery();
                self.executeQuery(queries.user);
            } else {
                self.deleteMarkers(queries.user.name);
            }
        }, this);
        self.geocoder = new google.maps.Geocoder();
        self.geocode;
        self.mapRadius = 2000;
        self.getGeocode = function(callback) {
            self.geocoder.geocode({'address': self.address()}, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    callback(results[0].geometry.location);
                } else {
                    alert('status: ' + status);
                }
        })};
        self.map = false;
        self.updateMap = function() {
            self.getGeocode(function(geocode){
            self.geocode = geocode;
            if (!self.map) {
                self.map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 14,
                    center: geocode
                });
                google.maps.event.addListener(self.map, 'bounds_changed', function() {
                    // Remove markers and results that are out of the map's bounds
                    var bounds = self.map.getBounds();
                    var toDelete = [];
                    for (var i = 0; i < queryTypes.length; i++) {
                        for(var j = self.markers[queryTypes[i]].length - 1; j >= 0 ; j--) {
                            if (!bounds.contains(self.markers[queryTypes[i]][j].position)) {
                                self.removeResult(self.markers[queryTypes[i]][j].place_id);
                                delete self.markers[queryTypes[i]][j]
                                }
                            }
                            self.markers[queryTypes[i]] = self.markers[queryTypes[i]].filter(marker => typeof marker !== 'undefined');
                        } console.log(toDelete);
                    self.displayQueries();});
            } else {
                self.map.setCenter(geocode);
            }
            var marker = new google.maps.Marker({
                map: self.map,
                position: geocode,
                icon: {'url': 'http://maps.google.com/mapfiles/kml/shapes/ranger_station.png', 'scaledSize': new google.maps.Size(50, 50)}
            });
            self.markers['address'].push(marker);
        });};
        self.updateMap();
        self.setAddress = function() {
            console.log("setting address");
            self.updateMap();
        };
        self.createMarker = function (place, indicator) {
            var marker = new google.maps.Marker({
                map: self.map,
                position: place.geometry.location,
                icon: indicator,
                title: place.name,
                place_id: place.place_id
            });
            return marker;
        };

        self.deleteMarkers = function(name) {
            console.log('deleting');
            for (var i = 0; i < self.markers[name].length; i++) {
                self.markers[name][i].setMap(null);
            }
            self.markers[name] = [];
        };
        self.deleteAllMarkers = function() {
            self.deleteMarkers('address');
            self.deleteMarkers('restaurants');
            self.deleteMarkers('parks');
            self.deleteMarkers('grocery');
            self.deleteMarkers('schools');
            self.deleteMarkers('user');
        }
        self.placeService = false;
        self.executeQuery = function(query, markers) {
            if (!self.placeService){
                self.placeService = new google.maps.places.PlacesService(self.map);
            }
            self.placeService.nearbySearch({
                bounds: self.map.getBounds(),
                location: self.geocode,
                radius: self.mapRadius,
                type: query.type,
                keyword: query.keyword
            }, function(results, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    for (var i=0; i < results.length; i++) {
                        var duplicate = false;
                        var j = 0;
                        while (!duplicate && j < self.resultList.length){
                            if (results[i].place_id == self.resultList[j].place_id ) {
                                duplicate = true;
                                console.log('duplicate found!');
                            }
                            j++;
                        }
                        if (!duplicate) {
                            self.resultList.push(results[i]);
                            self.markers[query.name].push(self.createMarker(results[i], query.icon));
                        }
                    }
                }
            });
        }
        self.displayGrocery = function() {
                if (self.grocery()) {
                    self.executeQuery(queries.grocery);
                }
            };
        self.displayRestaurants = function() {
            if (self.restaurants()) {
                self.executeQuery(queries.restaurants);
            }
        };
        self.displayParks= function() {
            if (self.parks()) {
                self.executeQuery(queries.parks);
            }
        };
        self.displaySchools = function() {
            if (self.schools()) {
                self.executeQuery(queries.schools);
            }
        };
        self.displayUserQ = function() {
            if (self.userQuery() && self.userCheck()) {
                queries.user.keyword = self.userQuery();
                self.executeQuery(queries.user);
            }
        };
        self.displayQueries = function() {
            self.displayRestaurants();
            self.displayGrocery();
            self.displayParks();
            self.displaySchools();
            self.displayUserQ();
        };
    };

    ko.applyBindings(new NeighborhoodViewModel());
});
