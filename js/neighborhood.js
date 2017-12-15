$(function() {
    var NeighborhoodViewModel = function() {
        var self = this;
        self.getStaticQueryInfo = function(query) {
            // Contains information about how to execute queries and how to render them. It is static except for the 'type' and 'keyword' parameters of the user-defined query.
            var baseIconUrl = 'https://maps.google.com/mapfiles/kml/shapes/';
            return {
                'restaurants': {
                    'name': 'restaurants',
                    'icon': {
                        'url': baseIconUrl + 'dining.png',
                        'scaledSize': new google.maps.Size(40, 40)
                    },
                    'type': 'restaurant',
                    'keyword': false,
                    'default_value': false // Make true to display query on initialization
                },

                'grocery': {
                    'name': 'grocery',
                    'icon': {
                        'url': baseIconUrl + 'grocery.png',
                        'scaledSize': new google.maps.Size(40, 40)
                    },
                    'type': 'supermarket',
                    'keyword': false,
                    'default_value': true
                },

                'parks': {
                    'name': 'parks',
                    'icon': {
                        'url': baseIconUrl + 'parks.png',
                        'scaledSize': new google.maps.Size(40, 40)
                    },
                    'type': 'park',
                    'keyword': false,
                    'default_value': false
                },

                'schools': {
                    'name': 'schools',
                    'icon': {
                        'url': baseIconUrl + 'schools.png',
                        'scaledSize': new google.maps.Size(40, 40)
                    },
                    'type': 'school',
                    'keyword': false,
                    'default_value': false
                },

                'user': {
                    'name': 'user',
                    'icon': {
                        'url': 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png',
                        'scaledSize': new google.maps.Size(40, 40)
                    },
                    'type': false,
                    'keyword': false,
                    'default_value': false
                }
            }[query];
        };

        // MAP PROPERTIES

        self.address = ko.observable("Denver, CO"); // Initial address
        self.placeService = false;
        self.map = false;
        self.photoArray = ko.observableArray();
        self.geocoder = new google.maps.Geocoder();
        self.boundsChange = ko.observable();
        self.searchRadius = ko.observable();
        self.searchRadius.subscribe(function(newRadius) {
            if (self.map) {
                self.displayQueries();
            }
        }, this);


        // QUERY PROPERTIES

        self.queryArray = [new Query('restaurants'), new Query('grocery'), new Query('parks'), new Query('schools'), new Query('user')];
        self.getQuery = function(queryName) {
            for (var i = 0; i < self.queryArray.length; i++) {
                if (self.queryArray[i].name == queryName) {
                    return self.queryArray[i];
                }
            }
        };
        self.userFilter = ko.observable('');
        self.maxResults = 20;
        self.filteredResultArray = ko.computed(function() {
            var resultArray = [];
            for (var i = 0; i < self.queryArray.length; i++) {
                resultArray = resultArray.concat(self.queryArray[i].results().filter(result => result.name.toLowerCase().includes(self.userFilter().toLowerCase())));
            }
            return resultArray;
        }, this);

        self.showVisibleResults = function() {
            // Removes results in the filter list if they are not in the visible area of the map
            if (!self.map || self.filteredResultArray().length === 0) {
                return;
            }
            var bounds = self.map.getBounds();
            var markerPos;
            var result;

            for (var i = 0; i < self.filteredResultArray().length; i++) {
                result = self.filteredResultArray()[i];
                markerPos = {
                    'lat': result.geometry.location.lat(),
                    'lng': result.geometry.location.lng()
                };
                if (bounds.contains(markerPos)) {
                    document.getElementById('result' + result.place_id).setAttribute("style", "display: block");
                } else {
                    document.getElementById('result' + result.place_id).setAttribute("style", "display: none");
                }
            }
        };

        self.toggleResults = function() {
            $('#filtered-results').toggle();
        };

        // CORE MAP / DISPLAY FUNCTIONS

        self.displayQueries = function() {
            for (var i = 0; i < self.queryArray.length; i++) {
                self.queryArray[i].executeQuery();
            }
        };

        self.getGeocode = function(callback) {
                                        console.log('here');
            self.geocoder.geocode({
                'address': self.address()
            }, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    callback(results[0].geometry.location);
                } else {
                    alert('status: ' + status);
                }
            });
        };

        self.initMap = function() {
            self.getGeocode(function(geocode) {
                self.geocodeAddress = geocode;
                if (!self.map) {
                    self.map = new google.maps.Map(document.getElementById('map'), {
                        zoom: 14,
                        center: self.geocodeAddress
                    });
                    self.map.addListener('bounds_changed', function() {
                        self.showVisibleResults();
                    })
                    self.addressMarker = new google.maps.Marker({
                        map: self.map,
                        animation: google.maps.Animation.DROP,
                        position: self.geocodeAddress,
                        title: self.address(),
                        icon: {
                            'url': 'http://maps.google.com/mapfiles/kml/shapes/ranger_station.png',
                            'scaledSize': new google.maps.Size(50, 50)
                        }
                    });
                    self.displayQueries();
                }
            });
        };

        self.updateAddress = function() {
            self.getGeocode(function(geocode) {
                self.geocodeAddress = geocode;
                self.map.setCenter(geocode);
                self.addressMarker.setPosition(geocode);
                self.addressMarker.title = self.address();
                self.addressMarker.setAnimation(google.maps.Animation.DROP);
                self.displayQueries();
            });
        };


        //MARKERS

        self.createMarker = function(place, query) {
            var marker = new google.maps.Marker({
                map: self.map,
                animation: google.maps.Animation.DROP,
                position: place.geometry.location,
                icon: query.static.icon,
                title: place.name,
                place_id: place.place_id
            });
            marker.addListener('click', function() {
                self.toggleInfoWindow(marker);
            });
            return marker;
        };

        self.getMarker = function(place_id, query) {
            for (var i = 0; i < self.queryArray.length; i++) {
                if (self.queryArray[i].name == query) {
                    return self.queryArray[i].getMarkerById(place_id);
                }
            }
        };

        self.getResultFromMarker = function(marker) {
            return self.filteredResultArray().filter(result => result.place_id === marker.place_id);
        }

        self.deleteAllMarkers = function(address = false) {
            if (address) {
                self.addressMarker.setMap(null);
                self.addressMarker = null;
            }
            for (var i = 0; i < queryArray.length; i++) {
                queryArray[i].clearAll();
            }
        };

        self.animateMarker = function(place_id = false, query = false, marker = false) {
            if (!marker) {
                marker = self.getMarker(place_id, query);
            }
            if (marker.getAnimation() !== null) {
                window.setTimeout(function() {
                    marker.setAnimation(null);
                }, 745);
            } else {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                window.setTimeout(function() {
                    marker.setAnimation(null);
                }, 745);
            }
        };


        // INFOWINDOW and PHOTOS

        self.currentInfoWindow = new google.maps.InfoWindow({
            content: "<div><p>Hello!</p></div>"
        });

        self.toggleInfoWindow = function(marker) {
            self.animateMarker(false, false, marker = marker);
            var result = self.getResultFromMarker(marker)[0];
            self.photoArray.removeAll();
            window.setTimeout(function() {
                marker.setAnimation(null);
            }, 500);
            self.currentInfoWindow.setContent(self.getWindowContent(result));
            self.currentInfoWindow.open(self.map, marker);
            self.populatePhotoArray(result);
        };

        self.populatePhotoArray = function(result) {
            var photoCounter = 0;
            var maxPhotos = 5;
            var photoWidth = '600'; //in pixels
            var photoUrl;
            if (result) {
                for (var i = 0; i < result.photos.length && i < maxPhotos; i++) {
                    photoUrl = result.photos[0].getUrl({
                        maxWidth: photoWidth
                    });
                    self.photoArray.push({
                        'url': photoUrl
                    });
                }
            }
            var flickrUrl = "https://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";
            $.ajax({
                url: flickrUrl,
                dataType: 'jsonp',
                data: {
                    "tags": result.name,
                    "format": "json"
                },
                success: function(photos) {
                    console.log(photos.items[0])
                    for (var i = 0; i < photos.items.length && i < maxPhotos; i++) {
                        self.photoArray.push({
                            'url': photos.items[i].media.m
                        });
                    }
                }
            }).fail(function() {
                alert('Failed to retrieve Flickr photos')
            });
        };

        self.getWindowContent = function(result) {
            var googleMapUrl = 'https://www.google.com/maps/search/?api=1&query=Google&query_place_id=' + result.place_id;
            contentString = '<div><h5><a href="' + googleMapUrl + '" target="_blank">';
            contentString += result.name + "</a></h5>";
            if (result.price_level) {
                contentString += "<p>";
                for (var i = 0; i < result.price_level; i++) {
                    contentString += "$";
                }
                contentString += "</p>"
            }
            if (result.rating) {
                contentString += "<p>Rating: <b>" + result.rating + "</b>/5</p>";
            }

            return contentString;
        };


// QUERY OBJECT (CARRIES OUT SEARCHING FUNCTIONALITY)

        function Query(name) {
            var q = this;
            q.name = name;
            q.static = self.getStaticQueryInfo(name);
            q.check = ko.observable(q.static.default_value);
            if (q.name == 'user') {
                q.userQuery = ko.observable();
            }
            q.markers = [];
            q.results = ko.observableArray();
            q.getMarkerById = function(place_id) {
                for (var i = 0; i < q.markers.length; i++) {
                    if (q.markers[i].place_id == place_id) {
                        return q.markers[i];
                    }
                }
            };
            q.clearAll = function() {
                q.clearMarkers();
                q.results.removeAll();
            }
            q.clearMarkers = function() {
                for (var i = 0; i < q.markers.length; i++) {
                    q.markers[i].setMap(null);
                }
                q.markers = [];
            };
            q.check.subscribe(function() {
                if (q.check()) {
                    q.executeQuery();
                } else {
                    q.clearAll();
                }
            });
            q.executeQuery = function() {
                if ((q.check() && q.name !== 'user') || (q.name === 'user' && q.check() && q.userQuery())) {
                    if (q.name === 'user') {
                        q.static.keyword = q.userQuery();
                    }
                    if (!self.placeService) {
                        self.placeService = new google.maps.places.PlacesService(self.map);
                    }
                    self.placeService.nearbySearch({
                        location: self.geocodeAddress,
                        radius: self.searchRadius(),
                        type: q.static.type,
                        keyword: q.static.keyword
                    }, function(places, status) {
                        if (status === google.maps.places.PlacesServiceStatus.OK) {
                            q.clearAll();
                            for (var i = 0; i < places.length; i++) {
                                var place = places[i];
                                place.query = q.static.name;
                                q.markers.push(self.createMarker(place, q));
                                q.results.push(place);
                            }
                            self.showVisibleResults();
                        } else {
                            alert('Failed to get search results.');
                        }
                    });
                }
            };
        }
        // Initialize Map and Queries
        self.initMap();
        $(window).resize(function() {
            // Keeps main address if widow changes
            self.map.setCenter(self.geocodeAddress);
        });
    };

    ko.applyBindings(new NeighborhoodViewModel());
});
