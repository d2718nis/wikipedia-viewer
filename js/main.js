// Contains all requested pages info
var pages;
var pageStats;
var pagesPrepared;

// Request JSON from Wikipedia API for autocomplete
function requestAutocomplete(value) {
	const getAutocomplete = $.getJSON(`https://en.wikipedia.org//w/api.php?
		action=opensearch
		&format=json
		&origin=*
		&search=${value}
		&limit=10`);

	getAutocomplete.then(json => {
		let searchRequested = false;
		// Check if search field value equals on of the suggestions
		$.each($('#search-autocomplete > option'), (i, item) => {
			if (item.value == $('.search-field').val()) {
				searchRequested = true;
			}
		});
		if (searchRequested) {
			requestWikiInfo($('.search-field').val());
			$('#search-autocomplete').html('');
		} else {
			$('#search-autocomplete').html('');
			// First element equals searched value, exclude it
			if (json[1].length > 1) {
				$.each(json[1].slice(1), (i, item) => {
					$('#search-autocomplete').append(`<option value="${item}">`)
				});
			}
		}
	});

	getAutocomplete.catch(err => {
		console.log('GetAutocomplete: ' + JSON.stringify(err));
	});
}

// Request JSON from Wikipedia API
function requestWikiInfo(value) {
	const getWiki = $.getJSON(`https://en.wikipedia.org/w/api.php?
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
		&ppprop=disambiguation`);

	getWiki.then(json => {
		// Remove previous articles
		$('.article').remove();
		$('.three-lines').remove();
		if (json.hasOwnProperty('query')) {
			// Prepare the array
			preparePages(json.query.pages);
			$.each(pagesPrepared, (i, item) => {
				placeArticle(item.page, value, item.position);
			});
			calculateImages();
		} else {
			$('.no-matches').css('display', 'block');
		}
	});

	getWiki.catch(err => {
		console.log('GetWiki: ' + JSON.stringify(err));
	});
}

// Prepare pages
function preparePages(articles) {
	// TODO: delete this thing, TMP only
	pages = [];
	pageStats = { index: [], length: [], rate: [], k1: [], k234: [] };
	pagesPrepared = [];
	$.each(articles, (i, item) => {
		// Populate the array
		if (!item.hasOwnProperty('pageprops') && item.hasOwnProperty('extract')) {
			pages.push(item);
			// Page stats and counters
			pageStats.index.push(item.index);
			pageStats.length.push(item.extract.length);
			pageStats.rate.push(item.hasOwnProperty('thumbnail') ? item.thumbnail.width / item.thumbnail.height : 0);
			pageStats.k1.push(item.hasOwnProperty('thumbnail') ? Math.round(item.extract.length * item.thumbnail.width 
				* (item.thumbnail.width / item.thumbnail.height)) : 0);
			pageStats.k234.push(item.hasOwnProperty('thumbnail') ? Math.round(item.extract.length * item.thumbnail.height 
				/ (item.thumbnail.width / item.thumbnail.height)) : 0);
		}
	});
	populatePagesPrepared(pageStats.rate.reduce((acc, val) => acc += val ? 1 : 0));
}

// Move item from pages array
function seekAndDestroy(sInd) {
	let articleToReturn;
	$.each(pages, (i, article) => {
		if (article.index == pageStats.index[sInd]) {
			articleToReturn = article;
			pages.splice(pages.indexOf(articleToReturn), 1);
			$.each(pageStats, (i, pageStat) => {
				// Remove index[sInd], length[sInd] ...
				pageStat.splice(sInd, 1);
			});
			// break
			return false;
		}
	});
	return articleToReturn;
}

// Fill pagesPrepared depending on thumbnail quantity
function populatePagesPrepared(countThumbnails) {
	// Build page prototype
	let firstPage = [];
	switch(countThumbnails) {
		case 0:
			// Article with longest extract
			firstPage[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		case 1:
			// Article with image
			firstPage[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			// Article with longest extract
			firstPage[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		case 2:
			// Article with maximum k234 factor
			firstPage[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPage[2] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			// Article with longest extract
			firstPage[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		case 3:
			// Article with maximum k234 factor
			firstPage[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPage[2] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPage[3] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			// Article with longest extract
			firstPage[0] = seekAndDestroy(pageStats.length.indexOf(Math.max(...pageStats.length)));
			break;
		default:
			// Article with maximum k234 factor
			firstPage[0] = seekAndDestroy(pageStats.k1.indexOf(Math.max(...pageStats.k1)));
			// Article with maximum k234 factor
			firstPage[1] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPage[2] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			firstPage[3] = seekAndDestroy(pageStats.k234.indexOf(Math.max(...pageStats.k234)));
			break;
	}
	const limiter = countThumbnails + 1 > 3 ? 4 : countThumbnails + 1;
	for (let i = 0; i < limiter; i++) {
		pagesPrepared.push({"position": i, "page": firstPage[i]});
	}
	// Fill pagesPrepared starting with 4th article ("second page")
	let i = 4;
	while (pages.length > 0) {
		const page = pages[Math.floor(Math.random() * pages.length)];
		pagesPrepared.push({"position": i, "page": page});
		pages.splice(pages.indexOf(page), 1);
		i++;
	}
}

// Generate and add to the page
function placeArticle(article, searchWord, articlePosition) {
	if (articlePosition < 4) {
		$('.container').append(getArticleHtml(article.title, article.extract, searchWord, articlePosition, article.thumbnail));
		$('.article-animate').eq(articlePosition).animate({opacity: 1}, 800 + articlePosition * 80);
	} else {
		if (articlePosition == 4) {
			createLines(searchWord);
		}
		getShortestLine().append(getArticleHtml(article.title, article.extract, searchWord, articlePosition, article.thumbnail));
	}
}

// Return article html string
function getArticleHtml(articleTitle, articleText, searchWord, articlePosition, articleThumbnail) {
	const img = getArticleImg(articleThumbnail, articlePosition);
	switch (articlePosition) {
		case 0:
			return `
			<div class="article article-animate row">
				<a class="col-xs-12" href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
					<h2 class="text-center standard-title title-${articlePosition+1}">
						${articleTitle}
					</h2>
				</a>
				<div class="col-xs-12 image-container-${articlePosition+1}">
					<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
						${img}
					</a>
				</div>
				<div class="col-xs-12 text-container-${articlePosition+1}">
					${highlightSearchWord(articleText, searchWord)}
				</div>
			</div>`;
		case 1:
			let delimiter = Math.round(articleText.length / 2);
			while (articleText.charAt(delimiter) !== ' ') {
				delimiter++;
			}
			return `
			<div class="article article-animate row">
				<a class="col-xs-12" href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
					<h2 class="text-center standard-title title-${articlePosition+1}">
						${articleTitle}
					</h2>
				</a>
				<div class="col-md-3 hidden-xs hidden-sm text-container-${articlePosition+1}-1">
					${highlightSearchWord(articleText.substr(0, delimiter), searchWord)}
				</div>
				<div class="col-xs-12 col-sm-8 col-md-6 image-container-${articlePosition+1}">
					<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
						${img}
					</a>
				</div>
				<div class="col-md-3 hidden-xs hidden-sm text-container-${articlePosition+1}-2">
					${highlightSearchWord(articleText.substr(delimiter + 1), searchWord)}
				</div>
				<div class="col-xs-12 col-sm-4 visible-xs-block visible-sm-block text-container-${articlePosition+1}-3">
					${highlightSearchWord(articleText, searchWord)}
				</div>
			</div>`;
		case 2:
		case 3:
			return `
			<div class="article article-animate row">
				<a class="col-xs-12" href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
					<h2 class="text-center standard-title">
						${articleTitle}
					</h2>
				</a>
				<div class="col-xs-12 col-sm-4 image-container-${articlePosition+1}">
					<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
						${img}
					</a>
				</div>
				<div class="col-xs-12 col-sm-8 text-container-${articlePosition+1}">
					${highlightSearchWord(articleText, searchWord)}
				</div>
			</div>`;
		default:
			return `
			<div class="article">
				<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
					<h2 style="${randomTitleStyle()}" class="text-center standard-title">
						${articleTitle}
					</h2>
				</a>
				<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}" target="_blank">
					${img}
				</a>
				${highlightSearchWord(articleText, searchWord)}
			</div>`;
	}
	
}

// Calculate article image properties and return
function getArticleImg(articleThumbnail, articlePosition) {
	let img = '', minHeight, imgClass;
	if (articleThumbnail !== undefined) {
		if (articlePosition == 0) {
			minHeight = articleThumbnail.height < $(document).height() / 2 ? articleThumbnail.height : $(document).height() / 2;
			imgClass = `image-article-${articlePosition+1}`;
		} else if (articlePosition < 4) {
			minHeight = articleThumbnail.height;
			imgClass = `image-article-${articlePosition+1}`;
		} else {
			minHeight = ($('.first-line').width() - $('.first-line').css('padding-left').replace('px', '') * 2) / 1.6;
			imgClass = `image-lines`;
		}
		img = `<div class="${imgClass} grayscale" style="min-height: ${minHeight}px; background-image: url(${articleThumbnail.source});"></div>`;
	}
	return img;
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
			</div>`);
}

// Random title style
function randomTitleStyle() {
	const italic = ['font-style: italic;', 'font-style: normal;'];
	const color = ['background-color: #333;color: #fff;', 'background-color: #fff;color: #333;'];
	const font = [`font-family: 'Lora', serif;`, `font-family: 'Abril Fatface', cursive;`,
	 `font-family: 'Open Sans', sans-serif;`];
	return italic[Math.floor(Math.random() * italic.length)] + color[Math.floor(Math.random() * color.length)]
	+ font[Math.floor(Math.random() * font.length)];
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
		const height = $('.header-center').height() - $('.header-side.hidden-xs').height() - 10;
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
function highlightSearchWord(text, searchWord) {
	return text.replace(RegExp(`(${searchWord})`, `ig`), `<span class="searchmatch">$1</span>`);
}


$(document).ready(() => {

	// Place header-side elements
	placeHeaderSides();

	// Resize event
	$(window).on('resize', () => {
		placeHeaderSides();
		calculateImages();
	});

	// Search onEnter event
	$('.search-field').keyup(event => {
		$('.no-matches').css('display', 'none');
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
	$('.search-field')[0].oninput = event => {
		$('.no-matches').css('display', 'none');
		if ($('.search-field').val().length && event.keyCode !== 13) {
			requestAutocomplete($('.search-field').val());
		}
	};

	// Easter egg
	$('.paper-title').on('click', () => {
		if ($('.paper-title').text() != `I'm Codin' It`) {
			$('.paper-title').text(`I'm Codin' It`);
		} else {
			$('.paper-title').text('The Wikipedia Times');
		}
		placeHeaderSides();
	});
});
