define(["jquery","views/carte", "models/player"], function($,Carte,Player){

	return {

		run : function(){
			// SoundCloud code
			var apiCreds = {
			  dev: {client_id: "9bee1c02578a1de5a3221134169dd2bb", redirect_uri: "http://localhost:8000/callback.html"},
			  live: {client_id: "1ace0b15cc5aa1dd79d254364fe6ba23", redirect_uri: "http://soundcarte.ponyho.st/callback.html"}
			};

			SC.initialize(location.hostname === "localhost" ? apiCreds.dev : apiCreds.live);


			$(function() {


				var daCarte = new Carte();

				daCarte.on("play-stream", function(streamData){ selectStream(streamData); });
				daCarte.on("toggle-stream", function(streamData){ selectStream(streamData); });
				daCarte.on("skip", function(){ skipSound(); });
				daCarte.on("back", function(){ skipSound(true); });
				daCarte.on("like", function(e){ 
					var track = Player.currentStream.tracks[Player.currentSoundNum];
					SC.put('/e1/me/track_likes/' + track.id, function(data) {
						console.log('saved to your likes!', data);
					})
					me.favoritesIds.push(track.id);
					toggleIfLiked($(e.target), track);
				});

				$("body").append(daCarte.render());

			  var storedToken = localStorage.getItem('SC.accessToken'); 

			  if (storedToken) {
			    SC.accessToken(storedToken);
			    initCarte();
			  } 

				$('#login').on('click', function(e){
					console.log('click', e)
					SC.connect(function(){
			      localStorage.setItem('SC.accessToken', SC.accessToken()); 
						initCarte();
					});
				});
			});

			function initCarte() {
			  $('.login-form').hide();
			  
			  setupStreams();
			  getUserData();
			};

			var me = {};

			function getUserData() {
			  SC.get('/me', function(data) {
			    me.user = data;
			    console.log('its me!', data);
			  });

			  SC.get('/me/followings/', {limit: 250}, function(data) {
			    me.followings = data;
			    // choose an interesting friend
			    var randomLiker = autoChoose(me.followings, function(f) { return f.public_favorites_count > 10 });
			    var randomFriend = autoChoose(me.followings, function(f) { return f.track_count > 10 });
			    // somebodies likes
			    displayStream.apply({title: randomLiker.username + '\'s Likes', url: '/users/' + randomLiker.id + '/favorites'});
			    // somebodies tracks
			    displayStream.apply({title: randomFriend.username + '\'s Sounds', url: '/users/' + randomFriend.id + '/tracks'});
			    //console.log('my friends!', data);
			  });
			  // get all my groups
			  SC.get('/me/groups/', function(data) {
			    me.groups = data;
			    var randomGroup = autoChoose(me.groups);
			    displayStream.apply({title: randomGroup.name + ' Group', url: '/groups/' + randomGroup.id + '/tracks'});
			    // console.log('my groups!', data);
			  });
			  // get ids of all my favorites
			  SC.get('/e1/me/track_likes/ids', {limit: 5000, linked_partitioning: 1},function(data) {
			    me.favoritesIds = data.collection;
			    console.log('my favorites!', data);
			  });

			  SC.get('/me/activities', {limit: 250},function(data) {
			    //me.favoritesIds = data.collection;
			    console.log('my classic stream!', data);
			  });


			}

			function autoChoose(array, condition) {
			  var getRandom = function(a) {
			    return a[Math.floor(Math.random() * a.length)];
			  };
			  var n = getRandom(array);
			  if (condition && !condition(n)){
			    n = autoChoose(array, condition);  
			  }
			  return n;
			};

			function getGenre() {
			  var g,
			      weekday = (new Date()).getDay(),
			      weekGenres = {
			        0: ['Folk', 'Folk Rock', 'Singer', 'Clasical', 'Soundtrack', 'Chillout'],
			        1: ['Minimal', 'Instrumental', 'Folk-pop'],
			        2: ['Jazz', 'Piano', 'Neoclassical', 'Lounge', 'Bossa Nova'],
			        3: ['Rock', 'Indie', 'Beats', 'Alternative', 'Acoustic', 'Indie Folk'],
			        4: ['Electro', 'Jazz House', 'Nu Jazz', 'Funk', 'Hip Hop'],
			        5: ['House', 'Tech House', 'Techno', 'Trap', 'Trance', 'Juke', 'Dubstep'],
			        6: ['Ambient', 'RnB', 'Beats', 'Nu Swing', 'Pop']
			      };

			  var choices = weekGenres[weekday];
			  return choices[Math.floor(Math.random() * choices.length)];
			}

			function setupStreams() {
				
			  // get a genre for today
			  var genre = getGenre();

				var streams = [
			    {title: 'My likes', url: '/me/favorites', randomize: true, params: {limit: 250}},
			    {title: 'My Next Stream', url: '/e1/me/stream', randomize: true, params: {limit: 50}},
			    {title: 'My friends likes', url: '/me/activities', randomize: true, params: {limit: 100}, parser: function(n) { return n.type === "favoriting" ? n.origin.track : undefined; }},
			    {title: 'Best of ' + genre, url: '/search/sounds', randomize: true, params: { q: '*', 'filter.genre_or_tag': genre.toLowerCase(), limit: 20, linked_partitioning: 1}, parser: function(n) { return n.kind === "track" ? n : undefined; }},
			    //{title: 'Shared to me', url: '/me/activities/tracks/exclusive', randomize: true},
			    //{title: 'Boiler Room latest', url: '/users/752705/tracks'},
			    {title: 'My sounds', url: '/me/tracks'}
			  ];

			  $.each(streams, displayStream);
				 

			};

			// load, process the api data, render the stream elements on the page

			var streamTemplate;

			function displayStream(){
			  var streamData = this;
			  if (!streamData) {
			    return;
			  }

			  streamTemplate = streamTemplate || Handlebars.compile($("#stream-template").html());
			  var standardParser = function(n){
			    return n.origin ? n.origin.track : n.track;
			  };

				SC.get(streamData.url, streamData.params, function(data){
			    // sometimes it's just track lists, sometimes acollections, e.g. in dashboards
					streamData.tracks = data.collection ? $.map(data.collection, streamData.parser || standardParser) : data;
			    // shuffle if needed
			    if (streamData.randomize) {
			      streamData.tracks = randomize(streamData.tracks);
			    }
			    // get a cover image
			    streamData.coverImg = getCoverImage(streamData.tracks[0]);
			    streamData.coverImg500 = getCoverImage(streamData.tracks[0], 't500x500');
			    // re-render the card
			    $card.html(streamTemplate(streamData));
			  });
			  // render the card placeholder
				var $card = $('<li>').html(streamTemplate(streamData));
			  $card.data('streamData', streamData);
				$('.carte').append($card)
			};


			$(window).on('keypress', function(event) {
			  var key = event.keyCode;
			  if (key === 32) {
			    event.preventDefault();
			    Player.playerToggle();
			  } else if (key === 106) {
			    skipSound();
			  } else if (key === 107) {
			    skipSound(-1);
			  }
			});

			function randomize(array) {
			  return array.sort(function() { return 0.5 - Math.random();})
			};

			var defaultImage = 'https://a2.sndcdn.com/assets/images/default/cloudx200-1ec56ce9.png';

			function getCoverImage(track, format) {
			  return (track.artwork_url || (track.user ? track.user.avatar_url : defaultImage)).replace('large', format || 't300x300');
			};

			// playlist order control
			
			function selectStream(streamData) {
			  if (Player.currentStream === streamData) {
			    //playerToggle();
			  } else {
			    Player.currentStream = streamData;
			    Player.currentSoundNum = 0;

			    //Player.playerStartCurrent();
			  
			  	Player.playerStartCurrent();

			  }
			  $(document.body).addClass('selected');
			  $('#current-stream').text(streamData.title);
			}

			function skipSound(back) {
			  if (back && Player.currentSoundNum > 0) {
			    Player.currentSoundNum --;
			    Player.playerStartCurrent();
			   
			  } else if (Player.currentSoundNum < Player.currentStream.tracks.length - 1) {
			    Player.currentSoundNum ++;
			    Player.playerStartCurrent(); 
			  }
			}

			function updateStreamStatus() {
			  var $stream = $('.carte li.active');
			  var track = Player.currentStream.tracks[Player.currentSoundNum];
			  // change the cover image
			  $stream.find('.cover').attr('src', getCoverImage(track));
			  $stream.find('.cover-big').attr('src', getCoverImage(track, 't500x500'));
			  
			  if (track.user) {
			    $stream.find('.user').attr('href', track.user.permalink_url).find('h2').text(track.user.username);
			  } else {
			    $stream.find('.user').attr('href', '').find('h2').text('');
			  }

			  $stream.find('.title').attr('href', track.permalink_url).find('h2').text(track.title);
			  // like button
			  toggleIfLiked($stream.find('.like'), track);
			  // change the window title so the tab looks better
			  updateTitle(true);
			};

			function updateTitle(playing) {
			  var track = Player.currentStream.tracks[Player.currentSoundNum];
			  // change the window title so the tab looks better
			  document.title = playing ? ['▶', track.title].join(' ') : 'SoundCarte';
			};

			function toggleIfLiked($node, track) {
			  // check if the track is in my favorites
			  var isLiked = $.inArray(track.id, me.favoritesIds) >= 0;
			  if (isLiked) {
			    $node.toggleClass('active', true).find('h2').text('Liked');
			  } else {
			    $node.toggleClass('active', false).find('h2').text('Like');
			  }
			};


			Player.events
				.on("finish", skipSound)
				.on("play", updateStreamStatus)
				.on("pause", function(){ updateTitle(false); })
				.on("resume", function(){ updateTitle(true); });
		}

	};

});