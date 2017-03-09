// Contains all requested pages info
var pages;
var pageStats;
var pagesPrepared;

// Request JSON from Wikipedia API for autocomplete
function requestAutocomplete(value) {
	const query = `https://en.wikipedia.org//w/api.php?
		action=opensearch
		&format=json
		&origin=*
		&search=${value}
		&limit=10`;
	const getAutocomplete = $.getJSON(query);

	getAutocomplete.then(function(json) {
		let searchRequested = false;
		// Check if input value equals on of the option values
		$.each($('#search-autocomplete>option'), function(i, item) {
			if (this.value == $('.search-field').val()) {
				searchRequested = true;
			}
		});
		if (searchRequested) {
			requestWikiInfo($('.search-field').val());
			$('#search-autocomplete').html('');
		} else {
			$('#search-autocomplete').html('');
			if (json[1].length > 1) {
				$.each(json[1].slice(1), function(i, item) {
					$('#search-autocomplete').append('<option value="' + item + '">');
				});
			}
		}
	});

	getAutocomplete.catch(function(err) {
		console.log('GetAutocomplete: ' + JSON.stringify(err));
	});
}

// Request JSON from Wikipedia API
function requestWikiInfo(value) {
	const query = `https://en.wikipedia.org/w/api.php?
		origin=*
		&format=json
		&action=query
		&generator=search
		&gsrsearch=${encodeURIComponent(value)}
		&gsrlimit=20
		&prop=pageimages|extracts|pageprops
		&piprop=thumbnail
		&pilimit=20
		&pithumbsize=1200
		&exintro
		&exlimit=20
		&ppprop=disambiguation`;

	const getWiki = $.getJSON(query);
	// Received JSON
	getWiki.then(function(json) {
		// Remove previous articles
		$('.article').remove();
		$('.three-lines').remove();
		if (json.hasOwnProperty('query')) {
			// Prepare the array
			preparePages(json);

			for (let i = 0; i < pagesPrepared.length; i++) {
				placeArticle(pagesPrepared[i].page, value, pagesPrepared[i].ind);
				//pagesPrepared.splice(i, 1);
			}
			calculateImages();
		} else {
			displayNoMatches();
		}
	});
	// Something went wrong
	getWiki.catch(function(err) {
		console.log('GetWiki: ' + JSON.stringify(err));
	});
}

// Prepare pages
function preparePages(json) {
	// TODO: delete this thing, TMP only
	pages = [];
	pageStats = {"index": [], 
				"length": [], 
				"width": [], 
				"height": [], 
				"rate": [], 
				"k1": [], 
				"k234": []};
	pagesPrepared = [];
	let countThumbnails = 0;
	$.each(json.query.pages, function(i, item) {
		// Populate the array
		if (!this.hasOwnProperty('pageprops') && this.hasOwnProperty('extract')) {
			pages.push(this);
			// Page stats and counters
			countThumbnails += this.hasOwnProperty('thumbnail') ? 1 : 0;
			pageStats.index.push(this.index);
			pageStats.length.push(this.extract.length);
			pageStats.width.push(this.hasOwnProperty('thumbnail') ? this.thumbnail.width : 0);
			pageStats.height.push(this.hasOwnProperty('thumbnail') ? this.thumbnail.height : 0);
			pageStats.rate.push(this.hasOwnProperty('thumbnail') ? this.thumbnail.width / this.thumbnail.height : 0);
			pageStats.k1.push(this.hasOwnProperty('thumbnail') ? Math.round(this.extract.length * this.thumbnail.width 
				* (this.thumbnail.width / this.thumbnail.height)) : 0);
			pageStats.k234.push(this.hasOwnProperty('thumbnail') ? Math.round(this.extract.length * this.thumbnail.height 
				/ (this.thumbnail.width / this.thumbnail.height)) : 0);
		}
	});
	populatePagesPrepared(countThumbnails);
}

// Move item from pages array
function seekAndDestroy(sInd) {
	let pageToReturn;
	$.each(pages, function(i, item) {
		if (this.index == pageStats.index[sInd]) {
			pageToReturn = this;
			pages.splice(pages.indexOf(pageToReturn), 1);
			$.each(pageStats, function(i, item) {
				// Remove index[sInd], length[sInd] ...
				this.splice(sInd, 1);
			});
			// break
			return false;
		}
	});
	return pageToReturn;
}

// Fill pagesPrepared depending on thumbnail quantity
function populatePagesPrepared(countThumbnails) {
	// Build page prototype
	let firstPages = [];
	switch(countThumbnails) {
		case 0:
			// Article with longest extract
			firstPages[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		case 1:
			// Article with image
			firstPages[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			// Article with longest extract
			firstPages[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		case 2:
			// Article with maximum k234 factor
			firstPages[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPages[2] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			// Article with longest extract
			firstPages[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		case 3:
			// Article with maximum k234 factor
			firstPages[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPages[2] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPages[3] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			// Article with longest extract
			firstPages[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		default:
			// Article with maximum k234 factor
			firstPages[0] = seekAndDestroy(pageStats.k1.indexOf(Math.max(...pageStats.k1)));
			// Article with maximum k234 factor
			firstPages[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPages[2] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPages[3] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			break;
	}
	const limiter = countThumbnails + 1 > 3 ? 4 : countThumbnails + 1;
	for (let i = 0; i < limiter; i++) {
		pagesPrepared.push({"ind": i, "page": firstPages[i]});
	}
	populateTheRestPages();
}

// Fill pagesPrepared starting with 4th article ("second page")
function populateTheRestPages() {
	let i = 4;
	while (pages.length > 0) {
		const page = pages[Math.floor(Math.random() * pages.length)];
		pagesPrepared.push({"ind": i, "page": page});
		pages.splice(pages.indexOf(page), 1);
		i++;
	}
}

// Generate and add to the page
function placeArticle(page, searchWord, ind) {
	if (ind < 4) {
		$('.container').append(getArticleHtml(page.title, makeText(page, searchWord), ind, page.thumbnail));
		$('.article-animate').eq(ind).animate({opacity: 1}, 800 + ind * 80);
	} else {
		if (ind == 4)
			createLines(searchWord);
		getShortestLine().html(getShortestLine().html() 
			+ getArticleHtml(page.title, makeText(page, searchWord), ind, page.thumbnail));
	}
}

// Return article 
function getArticleHtml(pageTitle, text, ind, thumbnail) {
	let minHeight;
	let imgClass = '';
	let img = '';
	if (thumbnail !== undefined) {
		if (ind == 0) {
			minHeight = thumbnail.height < $(document).height() / 2 ? thumbnail.height : $(document).height() / 2;
			imgClass = `image-article-${ind+1}`;
		} else if (ind < 4) {
			minHeight = thumbnail.height;
			imgClass = `image-article-${ind+1}`;
		} else {
			minHeight = ($('.first-line').width() - $('.first-line').css('padding-left').replace('px', '') * 2) / 1.6;
			imgClass = `image-lines`;
		}
		img = `<div class="${imgClass} grayscale" style="min-height: ${minHeight}px; background-image: url(${thumbnail.source});"></div>`;
	}
	switch (ind) {
		case 0:
			return `
			<div class="article article-animate row">
				<a class="col-xs-12" href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
					<h2 class="text-center standard-title title-${ind+1}">
						${pageTitle}
					</h2>
				</a>
				<div class="col-xs-12 image-container-${ind+1}">
					<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
						${img}
					</a>
				</div>
				<div class="col-xs-12 text-container-${ind+1}">
					${text}
				</div>
			</div>
			`;
		case 1:
			let delimiter = Math.round(text.length / 1.85);
			while (text.charAt(delimiter) !== ' ') {
				delimiter++;
			}
			const text1 = text.substr(0, delimiter);
			const text2 = text.substr(delimiter + 1);
			return `
			<div class="article article-animate row">
				<a class="col-xs-12" href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
					<h2 class="text-center standard-title title-${ind+1}">
						${pageTitle}
					</h2>
				</a>
				<div class="col-md-3 hidden-xs hidden-sm text-container-${ind+1}-1">
					${text1}
				</div>
				<div class="col-xs-12 col-sm-8 col-md-6 image-container-${ind+1}">
					<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
						${img}
					</a>
				</div>
				<div class="col-md-3 hidden-xs hidden-sm text-container-${ind+1}-2">
					${text2}
				</div>
				<div class="col-xs-12 col-sm-4 visible-xs-block visible-sm-block text-container-${ind+1}-3">
					${text}
				</div>
			</div>
			`;
		case 2:
		case 3:
			return `
			<div class="article article-animate row">
				<a class="col-xs-12" href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
					<h2 class="text-center standard-title">
						${pageTitle}
					</h2>
				</a>
				<div class="col-xs-12 col-sm-4 image-container-${ind+1}">
					<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
						${img}
					</a>
				</div>
				<div class="col-xs-12 col-sm-8 text-container-${ind+1}">
					${text}
				</div>
			</div>
			`;
		default:
			return `
			<div class="article">
				<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
					<h2 style="${randomTitleStyle()}" class="text-center standard-title">
						${pageTitle}
					</h2>
				</a>
				<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank">
					${img}
				</a>
				${text}
			</div>
			`;
	}
	
}

// Create lines
function createLines(searchWord) {
	$('.container').append(`
			<div class="row three-lines">
				<div class="col-xs-12 header-lines text-center">
					More exciting about ${searchWord} down below
				</div>
				<div class="col-xs-12 col-sm-4 first-line"></div>
				<div class="col-xs-12 col-sm-4 second-line"></div>
				<div class="col-xs-12 col-sm-4 third-line"></div>
			</div>
			`);
}

// Create template placeholders
function createTemplatePlaceholders(count) {
	for (let i = 0; i < count; i++) {
		$('.container').append(`
			<div class="article">
				<h2 class="grayed-title">
					<span>.</span>
				</h2>
				<div class="grayed-image">.</div>
				<div class="grayed-text-container">
					<p class="grayed-text">
						<span>.</span>
						<span>.</span>
						<span>.</span>
						<span>.</span>
					</p>
					<p class="grayed-text">
						<span>.</span>
						<span>.</span>
						<span>.</span>
						<span>.</span>
						<span>.</span>
						<span>.</span>
					</p>
				</div>
			</div>
			`);
	}
}

// Random title style
function randomTitleStyle() {
	const italic = ['font-style: italic;', 'font-style: normal;'];
	const color = ['background-color: #333;color: #fff;', 'background-color: #fff;color: #333;'];
	const font = [`font-family: 'Lora', serif;`, `font-family: 'Abril Fatface', cursive;`,
	 `font-family: 'Open Sans', sans-serif;`];
	let style = italic[Math.floor(Math.random() * italic.length)];
	style += color[Math.floor(Math.random() * color.length)];
	return style += font[Math.floor(Math.random() * font.length)];
}

// Get the shortest
function getShortestLine() {
	return [$('.first-line'), $('.second-line'), $('.third-line')].reduce((acc, val) =>
		acc = val.height() < acc.height() ? val : acc);
}

// Calculate title squres height and paddings
function placeHeaderSides() {
	if ($(document).width() >= 768) {
		$('.header-side.hidden-xs').css('padding-top', '10px');
		height = $('.header-center').height() - $('.header-side.hidden-xs').height() - 10;
		if (height > 10)
			$('.header-side.hidden-xs').css('padding-top', height);
	}
}

// Calculate 2-3-4 articles image sizes
function calculateImages() {
	if ($(document).width() >= 768) {
		if ($(document).width() > 768) {
			// If .text-container-2-1 exists
			if ($('.text-container-2-1').length) {
			// Depends on which column is higher
				if ($('.text-container-2-1').css('height').replace('px', '') > $('.text-container-2-2').css('height').replace('px', '')) {
					$('.image-article-2').css('min-height', $('.text-container-2-1').css('height'));
				} else {
					$('.image-article-2').css('min-height', $('.text-container-2-2').css('height'));
				}
			}
		} else {
			$('.image-article-2').css('min-height', $('.text-container-2-3').css('height'));
		}
		
		$('.image-article-3').css('min-height', $('.text-container-3').css('height'));
		$('.image-article-4').css('min-height', $('.text-container-4').css('height'));
	} else {
		let minHeight = ($('.row').width() - $('.row').css('padding-left').replace('px', '') * 2) / 1.6;
		$('.image-article-2').css('min-height', minHeight + 'px');
		$('.image-article-3').css('min-height', minHeight + 'px');
		$('.image-article-4').css('min-height', minHeight + 'px');
	}
}

// Highlight searched value in the results
function makeText(page, searchWord) {
	return page.extract.replace(RegExp(`(${searchWord})`, `ig`), `<span class="searchmatch">$1</span>`);
}

function displayNoMatches() {
	$('.no-matches').text('No results were found under your search, try something else.');
	$('.no-matches').css('display', 'block');
}

function hideNoMatches() {
	$('.no-matches').css('display', 'none');
	$('.no-matches').text('');
}


$(document).ready(function() {

	// Place header-side elements
	placeHeaderSides();

	// Resize event
	$(window).on('resize', function() {
		placeHeaderSides();
		calculateImages();
	});

	// Search onEnter event
	$('.search-field').keyup(function(event) {
		hideNoMatches();
		if ($('.search-field').val().length) {
			// 13 for Enter key
			if (event.keyCode == 13) {
				requestWikiInfo($('.search-field').val());
				$('#search-autocomplete').html('');
			}
		} else {
			$('#search-autocomplete').html('');
			// This is needed to hide <datalist> in Chrome
			$('.search-field').blur();
			$('.search-field').focus();
		}
	});

	// HTML5 event handler
	$('.search-field')[0].oninput = function(event) {
		hideNoMatches();
		if ($('.search-field').val().length && event.keyCode !== 13) {
			requestAutocomplete($('.search-field').val());
		}
	};

	// Easter egg
	$('.paper-title').on('click', function() {
		if ($('.paper-title').text() != `I'm Codin' It`) {
			$('.paper-title').text(`I'm Codin' It`);
		} else {
			$('.paper-title').text('The Wikipedia Times');
		}
		placeHeaderSides();
	});
});
