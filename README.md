# Neighborhood Helper - Udacity FSND - Nathaniel Gindele
This is a project for the Javascript/Organizational Frameworks/AJAX portion of the Udacity Full-Stack Nanodegee program. The web app displays an address on a map via the Google Maps API and allows users to query google for nearby results. Results can be filtered in real time via text search.

## Getting started
Clone the GitHub repository to your local machine including the file structure. Open the `neighborhood.html` file and within the Google Maps API script, replace the text `***-YOUR KEY HERE-***` with your Google Maps API key. (This can be obtained after registering on its developers' page). To view the web app, simply open the `neighborhood.html` file in a web browser.

## Functionality
The map rendering and search results are provided through the Google Maps and Places APIs. Given that this service is provided via a free account, at most 20 results are returned for any query. The names of the results are displayed on the left side and are color-coded according to their respective query and its icon color. Users may filter results, which remove their respective markers on the map. Photographs are obtained from the Google Places API and a 3rd-party Flickr API. Much of the layout and styling of the web page relies on Bootstrap.
