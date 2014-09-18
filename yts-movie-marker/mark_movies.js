
(function() {

chrome.extension.sendRequest('show icon', function() {});

var DB_NAME = 'ymmdb';
var DB_VERSION = 1;
var OS_YMM_SEEN = 'ymm_seen';
var OS_YMM_WATCHLIST = 'ymm_watchlist';
var db;

var ICON_MENU   = 'images/menu.png';
var ICON_CHECK  = 'images/check.png';
var ICON_REMOVE = 'images/minus.png';
var ICON_PIN    = 'images/pin.png';

window.onload = function() {
	// open the IndexedDB database named 'ymmdb'
	var request = indexedDB.open(DB_NAME, DB_VERSION);
	request.onsuccess = function(event) {
		db = this.result;
		createIconMenu();
		navigationExtension();
	};
	request.onerror = function(event) {
		console.error("Error openning database: " + event.target.errorCode);
	}

	// only the first time for creation of the object stores
	request.onupgradeneeded = function(event) {
		db = event.target.result;
		// create object stores for this database
		db.createObjectStore(OS_YMM_SEEN, {keyPath : "watched"});     //stores already seen movies
		db.createObjectStore(OS_YMM_WATCHLIST, {keyPath : "pinned"}); //stores pinned movies to watch later
	}
}

/*
 * Add a link (element) to an object store in database.
 */
function db_add(transaction_list, objStore, element) {

	db.transaction(transaction_list, "readwrite").objectStore(objStore)
		.add(element).onsuccess = function(evt) {
			console.log('Added: ' + evt.target.result + ' to store: ' + objStore);
		};
}

/*
 * Delete a link from an object store in database.
 */
function db_delete(transaction_list, objStores, element) {

	var transaction = db.transaction(transaction_list, "readwrite");
	objStores.forEach(function(obj) {
		transaction.objectStore(obj).delete(element).onsuccess = 
			(function(oStore) {
				return function(evt) {
					console.log('Removed: ' + evt.target.result + ' from store: ' + oStore);
				};
			})(obj);
	});
}

/*
 * Get everything from an object store. Use callback to process.
 */
function db_getAll(transaction_list, objStore, callback) {
	db.transaction(transaction_list).objectStore(objStore).openCursor().onsuccess = callback;
}

/*
 * Begin creation of the icon menu. First check whether we are in homepage or browsepage
 */
function createIconMenu() {
	// in case we're in home page
	if (document.URL.indexOf("/home") != -1 || document.URL == "https://yts.re/") {
		var browse_wrapper = document.getElementsByClassName('browse-wrapper');
		for (var i = 0; i < browse_wrapper.length; i++)
			processMovie(browse_wrapper[i]);
	} else {
		// retrieve all 'browse-info' elements
		var movie_infos = document.getElementsByClassName("browse-info");
		for (i = 0; i < movie_infos.length; i++)
			processMovie(movie_infos[i]);
	}

	// add the class 'ymm_di' to elements with class 'browseTitleLink'
	var titleLinks = document.getElementsByClassName('browseTitleLink');
	for (var j = 0; j < titleLinks.length; j++)
		titleLinks[j].className += ' ymm_di';
}

/*
 * Process a single movie element.
 */
function processMovie(movie) {
	var url = parseURL(movie);
	var selected_icon = ICON_MENU;

	var after = function(times, func) {
		return function() {
			if (--times == 0)
				return func.apply(this, arguments);
		};
	} (2, function() { return createExtra(movie, selected_icon, 2); });

	db.transaction([OS_YMM_SEEN]).objectStore(OS_YMM_SEEN).get(url)
		.onsuccess = function(event) {
			if (event.target.result && event.target.result.watched == url) {
				selected_icon = ICON_CHECK;
				console.log(selected_icon);
				createExtra(movie, selected_icon, 2);
			} else {
				after();
			}
		};

	db.transaction([OS_YMM_WATCHLIST]).objectStore(OS_YMM_WATCHLIST).get(url)
		.onsuccess = function(event) {
			if (event.target.result && event.target.result.pinned == url) {
				selected_icon = ICON_PIN;
				console.log(selected_icon);
				createExtra(movie, selected_icon, 2);
			} else {
				after();
			}
		};	
}

/*
 * Creates the icon menu and sets up event handlers.
 */
function createExtra(movie, selected_icon, state) {

	var ul  = document.createElement('ul');
	var li  = document.createElement('li');
	var a   = document.createElement('a');
	var ul2 = document.createElement('ul');
	var li2 = document.createElement('li');
	var a2  = document.createElement('a');
	var li3 = document.createElement('li');
	var a3  = document.createElement('a');
	var li4 = document.createElement('li');
	var a4  = document.createElement('a');

	ul.setAttribute('class', 'ymm_nav');

	ul .appendChild(li);
	li .appendChild(a);
	li .appendChild(ul2);
	ul2.appendChild(li2);
	li2.appendChild(a2);
	ul2.appendChild(li3);
	li3.appendChild(a3);
	ul2.appendChild(li4);
	li4.appendChild(a4);

	if (state == 1)       // browse page
		movie.children[0].insertBefore(ul, movie.children[0].children[1]);
	else if (state == 2)  // home page
		movie.children[0].children[0].insertBefore(ul, movie.children[0].children[0].children[1]);


	// create menu image
	var menu_img = createImgElement({'src':chrome.extension.getURL(selected_icon),
		'width':12, 'height':14}, a);


	// create 'check' image
	var img = createImgElement({'src':chrome.extension.getURL(ICON_CHECK),
		'title':'I watched this movie!', 'data-url':parseURL(movie), 'width':20, 'height':20}, a2);

	img.addEventListener('click', function(event) {
		var link = this.dataset.url;

		// remove from watchlist first, if it's in there
		db_delete([OS_YMM_WATCHLIST], [OS_YMM_WATCHLIST], link);
		// then, add to 'seen' list
		db_add([OS_YMM_SEEN], OS_YMM_SEEN, {'watched':link});
		
		a.removeChild(a.children[0]);
		createImgElement({'src':chrome.extension.getURL(ICON_CHECK),
			'width':12, 'height':14}, a);
	}, false);


	// create 'remove' image
	img = createImgElement({'src':chrome.extension.getURL(ICON_REMOVE),
		'title':'Reset', 'data-url':parseURL(movie), 'width':20, 'height':20}, a3);

	img.addEventListener('click', function(event) {
		var link = this.dataset.url;
		// remove movie from every object store
		db_delete([OS_YMM_SEEN, OS_YMM_WATCHLIST], [OS_YMM_SEEN, OS_YMM_WATCHLIST], link);
		// substitute previous image with the default menu image
		a.removeChild(a.children[0]);
		createImgElement({'src':chrome.extension.getURL(ICON_MENU), 'width':12, 'height':14}, a);
	}, false);


	// create 'pin' image
	img = createImgElement({'src':chrome.extension.getURL(ICON_PIN), 
		'title':'I might watch this movie', 'data-url':parseURL(movie), 'width':20, 'height':20}, a4);
	
	img.addEventListener('click', function(event) {
		var link = this.dataset.url;

		// remove from 'ymm_seen' list if it's there
		db_delete([OS_YMM_SEEN], [OS_YMM_SEEN], link);
		// add url to 'ymm_watchlist'
		db_add([OS_YMM_WATCHLIST], OS_YMM_WATCHLIST, {'pinned':link});

		a.removeChild(a.children[0]);
		createImgElement({'src':chrome.extension.getURL(ICON_PIN), 'width':12, 'height':14}, a);
	}, false);

}

/*
 * Extend the top right navigation menu to include links for the 'watched' and 'pinned' movies.
 */
function navigationExtension() {

	var nav_wrapper = document.getElementById('nav-wrapper');

	var li = document.createElement('li');
	var a  = document.createElement('a');
	a.textContent = 'Watched';
	a.href = '#';
	a.onclick = function(event) {
		event.preventDefault();
		showOverlay('watched');
	};

	li.appendChild(a);
	nav_wrapper.children[1].children[1].appendChild(li);

	li = document.createElement('li');
	a  = document.createElement('a');
	a.textContent = 'Pinned';
	a.href = '#';
	a.onclick = function(event) {
		event.preventDefault();
		showOverlay('pinned');
	};

	li.appendChild(a);
	nav_wrapper.children[1].children[1].appendChild(li);

}

/*
 * Show overlay div. 'what' is either 'watched' or 'pinned'
 */
function showOverlay(what) {

	var body = document.getElementsByTagName('body');

	var overlayDiv = document.createElement('div');
	overlayDiv.setAttribute('id', 'ymm_overlay');

	var modalDiv = document.createElement('div');
	modalDiv.setAttribute('class', 'ymm_modal');

	body[0].appendChild(overlayDiv);
	body[0].appendChild(modalDiv);

	overlayDiv.addEventListener('click', function(event) {
		body[0].removeChild(overlayDiv);
		body[0].removeChild(modalDiv);
	}, false);

	if (what == 'watched') {
		modalDiv.textContent = 'Movies I have watched';
		db_getAll([OS_YMM_SEEN], OS_YMM_SEEN, getAllCallback(modalDiv, [OS_YMM_SEEN]));

	} else if (what == 'pinned') {
		modalDiv.textContent = 'Pinned Movies';
		db_getAll([OS_YMM_WATCHLIST], OS_YMM_WATCHLIST, getAllCallback(modalDiv, [OS_YMM_WATCHLIST]));
	}

}

/*
 * Creates rows for each movie in the 'modal div'.
 */
function getAllCallback(mdiv, objStores) {
	return function(event) {
		var cursor = event.target.result;
		if (cursor) {
			var div = document.createElement('div');
			div.setAttribute('class', 'ymm_movierow');
			var span = document.createElement('span');

			var str = cursor.key.replace('https://yts.re/movie/', '');
			var words = str.split('_');
			words[words.length - 1]  = '(' + words[words.length - 1] + ')';
			str = words.join(' ');
			span.textContent = str;

			div.appendChild(span);
			mdiv.appendChild(div);

			var a = document.createElement('a');
			a.href = cursor.key;
			a.textContent = '(720p)';
			div.appendChild(a);

			a = document.createElement('a');
			a.href = cursor.key + '_1080p';
			a.textContent = '(1080p)';
			div.appendChild(a);

			a = document.createElement('a');
			a.href = '#';
			a.onclick = function(evt) {
				evt.preventDefault();
				db_delete(objStores, objStores, a.children[0].dataset.url);
				a.parentNode.parentNode.removeChild(a.parentNode);
			};

			var img = createImgElement({'src':chrome.extension.getURL(ICON_REMOVE),
				'title':'Remove this movie', 'data-url':cursor.key, 
				'width':12, 'height':12}, a);
			div.appendChild(a);

			cursor.continue();
		} else {
			console.log('No more entries.');
		}
	};
}


/*
 * Remove _1080p or _3D from a URL.
 */
function parseURL(elem) {
	// retrieve url to movie
	var link = elem.children[0].children[0].children[0].href;
	
	// split url on '_' and check the last word
	var words = link.split('_');
	var last = words.length - 1;

	// if last word on url is '1080p' or '3D', drop it
	if (words[last] == "1080p") {
		link = link.substring(0, link.length - 6);
	} else if (words[last] == "3D") {
		link = link.substring(0, link.length - 3);
	}
	return link;
}

/*
 * Create an 'img' element with the given attributes and parent element.
 */
function createImgElement(attrs, parent) {
	var img = document.createElement('img');

	for (var k in attrs)
		if (attrs.hasOwnProperty(k))
			img.setAttribute(k, attrs[k]);
	parent.appendChild(img);
	return img;
}

/*
 * Print object stores from database (used only for debugging).
 */
function printDB() {
	// print all objects in database
	db.transaction([OS_YMM_SEEN]).objectStore(OS_YMM_SEEN).openCursor()
		.onsuccess = function(event) {
			var cursor = event.target.result;
			if (cursor) {
				console.log("(Watched)Key is: " + cursor.key + ", Value is: " + cursor.value.watched);
				cursor.continue();
			} else {
				console.log("No more entries in 'seen'.");
			}
		};

	db.transaction([OS_YMM_WATCHLIST]).objectStore(OS_YMM_WATCHLIST).openCursor()
		.onsuccess = function(event) {
			var cursor = event.target.result;
			if (cursor) {
				console.log("(Pinned)Key is: " + cursor.key + ", Value is: " + cursor.value.pinned);
				cursor.continue();
			} else {
				console.log("No more entries in 'watchlist'.");
			}
		};
}

})();