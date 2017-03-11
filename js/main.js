// Contains all requested pages info
var articles;

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
		// Remove previous
		articles = [];
		if (json.hasOwnProperty('query')) {
			// Prepare the array
			prepareArticles(json.query.pages);
			$.each(articles, (i, item) => {
				placeArticle(item.raw, value, item.position);
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
function prepareArticles(jsonArticles) {
	$.each(jsonArticles, (i, item) => {
		// Populate the array
		if (!item.hasOwnProperty('pageprops') && item.hasOwnProperty('extract')) {
			articles.push({
				index: item.index,
				position: undefined,
				raw: item,
				stats: {
					length: item.extract.length,
					rate: item.hasOwnProperty('thumbnail') ? item.thumbnail.width / item.thumbnail.height : 0,
					k1: item.hasOwnProperty('thumbnail') ? Math.round(item.extract.length * item.thumbnail.width
				* (item.thumbnail.width / item.thumbnail.height)) : 0,
					k234: item.hasOwnProperty('thumbnail') ? Math.round(item.extract.length * item.thumbnail.height
				/ (item.thumbnail.width / item.thumbnail.height)) : 0
				}
			});
		}
	});
	// Pass number of thumbnails to the function
	populateArticlePositions(articles.reduce((acc, val) => acc += val.stats.rate ? 1 : 0, 0));
	// Sort by position field to place articles in right order
	articles.sort((a, b) => a.position - b.position);
}

// Set position for the article
function setArticlePosition(pos, stat) {
	articles[articles.indexOf(articles.find(el => {
		return el.stats[stat] == articles.reduce((acc, val) => {
			return acc = val.stats[stat] > acc && val.position === undefined  ? val.stats[stat] : acc;
	}, 0)}))].position = pos;
}

// Fill pagesPrepared depending on thumbnail quantity
function populateArticlePositions(countThumbnails) {
	switch(countThumbnails) {
		case 0:
			setArticlePosition(0, 'length');
			break;
		case 1:
			setArticlePosition(1, 'k234');
			setArticlePosition(0, 'length');
			break;
		case 2:
			setArticlePosition(1, 'k234');
			setArticlePosition(2, 'k234');
			setArticlePosition(0, 'length');
			break;
		case 3:
			setArticlePosition(1, 'k234');
			setArticlePosition(2, 'k234');
			setArticlePosition(3, 'k234');
			setArticlePosition(0, 'length');
			break;
		default:
			setArticlePosition(0, 'k1');
			setArticlePosition(1, 'k234');
			setArticlePosition(2, 'k234');
			setArticlePosition(3, 'k234');
			break;
	}
	// Fill position fields starting with 4th article ("second page")
	let i = 4;
	articles.map(val => val.position = val.position === undefined ? i++ : val.position);
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
