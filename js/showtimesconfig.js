// String map to format the badges properly
var QUALMAP = {
		"Closed Captioning": "CC",
		"Closed Captioned": "CC",
		"AMC Independent": "Ind",
		"Digital Presentation": "Digital",
		"RealD 3D": "3D"
	};

// Setups the Trailers object for use.
Trailers.init(
{
	"RESOLUTION": ( atv.device.preferredVideoPreviewFormat ) ? "-"+ atv.device.preferredVideoPreviewFormat.toLowerCase() +".xml" : "-"+ atv.device.preferredVideoFormat.toLowerCase() +".xml" ,

	// Set of base URLs that are used as a reference point for the other paths.
	"BASE_URL": "http://trailers.apple.com/appletv/us", // "http://sample-web-server/trailers", //  
	"IMAGE_BASE_URL": "http://trailers.apple.com",
	"TRAILER_BASE_URL":"http://trailers.apple.com/appletv/us",

	// I have added a default poster for those trailers that we don't have a poster for.
	"DEFAULT_POSTER": "http://trailers.apple.com/appletv/us/images/movie_large.png",

	// See the note above
	"QUALMAP": QUALMAP,

	// List of Javascript files to include on each file.
	"SCRIPT_URLS": [
	
		"http://trailers.apple.com/appletv/us/js/main.js",
		"http://trailers.apple.com/appletv/us/js/Trailers.js",
		"http://trailers.apple.com/appletv/us/js/Trailers.Showtimes.js",
		"http://trailers.apple.com/appletv/us/js/showtimesconfig.js"

		/*

		"http://sample-web-server/trailers/js/main.js",
		"http://sample-web-server/trailers/js/Trailers.js",
		"http://sample-web-server/trailers/js/Trailers.Showtimes.js",
		"http://sample-web-server/trailers/js/showtimesconfig.js"

		*/
	],

	// Main Query URL to retrieve showtimes from
	"SHOWTIME_QUERY_URL": "http://trailers.apple.com/trailers/global/scripts/showtimes.theaters.php?items_per_page=7",

	// URL to get an individual movie details.
	"SHOWTIME_MOVIE_DATA_URL": "http://trailers.apple.com/appletv/us/showtimes/%%MOVIEID%%.json",

	// Location Entry strings
	"LocationEntryTitle": "Zip Code Entry",
	"LocationEntryInstructions": "Please enter a valid US postal code.",
	"LocationEntryLabel": "Zip Code:",
	"LocationEntryFootnote": ""
	
} );


// Handles the navigation of the main navigation bar if a specific navigation callback hasn't been setup.
Trailers.registerCallbackEvent( "DEFAULT_NAVIGATION_HANDLER", function( event ) 
{
	ATVUtils.log("DEFAULT_NAVIGATION_HANDLER: "+ JSON.stringify( event ), 3 );
	var navId = event.navigationItemId,
		navItem = document.getElementById( navId ),
		url = navItem.getElementByTagName( "url" ).textContent;

	ATVUtils.log( 'DEFAULT_NAVIGATION_HANDLER: URL: '+ url, 3 );
	var ajax = new ATVUtils.Ajax(
		{
			"url": url,
			"success": function( xhr ) {
				var doc = xhr.responseXML;
				event.success( doc );
			},
			"failure": function( status, xhr ) {
				event.failure( "Unable to load requested page." );
			}
		});
} );

/**
 * Navigation Handler for the Showtimes Browser page. 
 * This method is fired from the Trailers.handleOnNavigate method.
 */
Trailers.registerCallbackEvent( "LoadShowtimes", function( event ) 
{
	
	var d = new Date(),

		LocalShowtimes = new Trailers.Showtimes(
		{
			"template": Trailers.getTemplate( "SHOWTIMES" ),
			"queryParams": {
				"show_date": d.toShowtimeString()
			},
			"date": d
		} );

	function success() 
	{
		try{
			var doc = this.processTemplate();
			event.success( doc );
		}
		catch( err )
		{
			ATVUtils.log("LoadShowtimes callback: Success Error: "+ JSON.stringify( err ), 0 )
		}
	};

	function failure( err ) 
	{
		ATVUtils.log( "Error loading showtime data: "+ JSON.stringify( err ), 0 );
		event.failure( JSON.stringify( err ) );
	};

	function StartLoadingData() 
	{
		ATVUtils.log( "LOAD SHOWTIMES: STARTLOADINGDATA: <eom>", 3 );
		LocalShowtimes.loadTheatreData( success, failure )
	};

	if( LocalShowtimes.location() ) 
	{
		StartLoadingData();
	} 
	else 
	{
		LocalShowtimes.getLocation( StartLoadingData, success );
	};

} );

/**
 * This method prompts the user to enter a new zip code and then updates the page.
 */
Trailers.registerCallbackEvent( "GetNewLocation", function() 
{
	var d = new Date();
	
	LocalShowtimes = new Trailers.Showtimes(
	{
		"template": Trailers.getTemplate( "SHOWTIMES" ),   
		"queryParams": {
			"show_date": d.toShowtimeString()
		},
		"date": d,
	} );

	function failure( err ) 
	{
		ATVUtils.log( "Error loading showtime data: "+ JSON.stringify( err ), 0 );
		event.failure( JSON.stringify( err ) );
	};

	LocalShowtimes.getLocation( LocalShowtimes.updateShowtimes, failure );

} );


/**
 * This method loads the individual movie showtimes page.
 * This is called when a movie is selected.
 * We will also use this option to load showtimes from the 
 * trailer detail page.
 */
Trailers.registerCallbackEvent( "LOAD_MOVIE_SHOWTIMES", function ( options ) 
{
	var d = new Date(),
		proxy = new atv.ProxyDocument,
		isNewTheatre = ( options.new_theatre == "YES" ),
		location = options.url.postal_code || ATVUtils.data( "LOCATION" ),
		show_date = options.url.show_date || d.toShowtimeString(),
		showtimes = new Trailers.Showtimes( 
		{
			"template": Trailers.getTemplate( "MOVIEPAGE" ),  
			"queryParams": 
			{
				"show_date": show_date,
				"postal_code": location
			},
			"tribune_id": options.url.tribune_id,
			"theatre_id": options.theatre_id,
			"date": d,
			"movie_id": options.movie_id,
			"navigationItemId": options.navigationItemId || "DATE_"+ d.toISOString()
		} );

	proxy.show();
	
	function success() 
	{
		try
		{
			ATVUtils.log( "LOAD_MOVIE_SHOWTIMES: SUCCESS: Processing the Movie Showtime Template", 3  );
			var doc = this.processTemplate();
			
			ATVUtils.log( "LOAD_MOVIE_SHOWTIMES: THIS IS IMPORTANT: isNewTheatre = "+ isNewTheatre +" | options: \n\n "+ JSON.stringify( options ), 3 );

			if( isNewTheatre ) 
			{
				ATVUtils.log( "LOAD_MOVIE_SHOWTIMES: WE ARE SWITCHING THEATRES", 3 );
				proxy.loadXML( doc );
				atv.unloadPage();
			}
			else
			{
				ATVUtils.log( "LOAD_MOVIE_SHOWTIMES: WE ARE LOADING A FRESH THEATRE", 3 );
				proxy.loadXML( doc );
			};
		}
		catch( err )
		{
			failure( err );
		};
	};

	function failure( err ) 
	{
		console.error("LOAD_MOVIE_SHOWTIMES: FAILURE: Error loading template data: "+ JSON.stringify( err ) );
		proxy.cancel();
	};

	function StartLoadingData() 
	{
		ATVUtils.log( "LOAD_MOVIE_SHOWTIMES: STARTLOADINGDATA: Loading Movie Data", 3 );
		showtimes.loadMovieShowtimeData( success, failure )
	};

	if( showtimes.location() ) 
	{
		ATVUtils.log( "LOAD_MOVIE_SHOWTIMES: We have a location", 3 );
		StartLoadingData();
	} 
	else 
	{
		showtimes.getLocation( StartLoadingData, failure );
	};

} );

// Handles the navigation on Individual Movie Showtimes page
Trailers.registerCallbackEvent( "MOVIE_SHOWTIMES_HANDLER", function( event ) 
{
	var elementId = "SHOWTIMES_ITEMS",
		navId = event.navigationItemId,
		navItem = document.getElementById( navId ),
		show_date = navItem.getElementByTagName( "url" ).textContent,
		timestamp = new Date( navItem.getElementByTagName( 'stash' ).getElementByTagName( 'dateTimeStamp' ).textContent ),
		location = ATVUtils.data( "LOCATION" ),
		movieProperties = JSON.parse( document.rootElement.getElementByTagName( "movieDetailProperties" ).textContent ),
		movieData = JSON.parse( unescape( document.rootElement.getElementByTagName( "movieData" ).textContent ) ),
		movieShowtimes = new Trailers.Showtimes(
			{
				"template": Trailers.getTemplate( "MOVIEPAGE" ),   
				"queryParams": 
				{
					"show_date": show_date,
					"postal_code": location
				},
				"tribune_id": movieProperties.tribune_id,
				"theatre_id": event.theatre_id || movieProperties.theatre_id,
				"date": timestamp,
				"movie_id": movieProperties.movie_id,
				"navigationItemId": navId
			});

	function success() 
	{
		try
		{
			ATVUtils.log( "MOVIE_SHOWTIMES_HANDLER: SUCCESS: Processing the Movie Showtime Template", 3  );
			var doc = this.processTemplate(),
				oldPage = document.getElementById( elementId ),
				newPage = doc.getElementById( elementId ),
				parent = oldPage.parent;
			
			newPage.removeFromParent();

			parent.replaceChild( oldPage, newPage );

			movieShowtimes.toggleSpinners();
		}
		catch( err )
		{
			failure( err );
		}
	};

	function failure( err ) 
	{
		console.error("Error loading template data: "+ JSON.stringify( err ) );
		movieShowtimes.toggleSpinners();
	};

	movieShowtimes.movieData = movieData;

	movieShowtimes.toggleSpinners();
	movieShowtimes.loadMovieShowtimeData( success, failure )
});





