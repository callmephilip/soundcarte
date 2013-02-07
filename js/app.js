// SoundCloud code
var apiCreds = {
  dev: {client_id: "9bee1c02578a1de5a3221134169dd2bb", redirect_uri: "http://localhost:8000/callback.html"},
  live: {client_id: "1ace0b15cc5aa1dd79d254364fe6ba23", redirect_uri: "http://soundcarte.ponyho.st/callback.html"}
};

SC.initialize(location.hostname === "localhost" ? apiCreds.dev : apiCreds.live);


$(function() {
	$('#login').on('click', function(e){
		console.log('click', e)
		SC.connect(function(){
			$('.login-form').hide();
			setupStreams();
      getUserData();
		});
	});
});

var me = {};

function getUserData() {
  SC.get('/me', function(data) {
    me.user = data;
    console.log('its me!', data);
  });

  SC.get('/me/followings/', {limit: 250}, function(data) {
    me.followings = data;
    console.log('my friends!', data);
  });

  SC.get('/me/groups/', function(data) {
    me.groups = data;
    console.log('my groups!', data);
  });

  SC.get('/me/favorites/', {limit: 5000},function(data) {
    me.favorites = data;
    me.favoritesIds = $.map(me.favorites, function(f) {
      return f.id;
    });
    console.log('my favorites!', data);
  });


}

function setupStreams() {
	

	var streams = [
    {title: 'My likes', url: '/me/favorites', randomize: true},
    {title: 'Tracks shared to me', url: '/me/activities/tracks/exclusive', randomize: true},
    {title: 'My friends', url: '/me/activities', randomize: true},
    {title: 'Field Recordings group', url: '/groups/8/tracks'},
    {title: 'Natalie\'s likes', url: '/users/4128493/favorites', randomize: true},
    {title: 'Boiler Room latest', url: '/users/752705/tracks'},
    {title: 'My sounds', url: '/me/tracks'}
  ];

  $.each(streams, displayStream);
	 

};

// load, process the api data, render the stream elements on the page

var streamTemplate;

function displayStream(){
  var streamData = this;
  streamTemplate = streamTemplate || Handlebars.compile($("#stream-template").html());

	SC.get(streamData.url, function(data){
    // sometimes it's just track lists, sometimes acollections, e.g. in dashboards
		streamData.tracks = data.collection ? $.map(data.collection, function(n){
      return n.origin.track;
    }) : data;
    // shuffle if needed
    if (streamData.randomize) {
      streamData.tracks = streamData.tracks.sort(function() { return 0.5 - Math.random();});
    }

    // get a cover image
    streamData.coverImg = getCoverImage(streamData.tracks[0]);
    $card.html(streamTemplate(streamData));
  });
	var $card = $('<li>').html(streamTemplate(streamData));
  $card.data('streamData', streamData);
	$('#carte').append($card)
};

// play start
$(document.body).on('click', '.cover', function(e) {
  var $stream = $(this).closest('li');
  $stream.addClass('active').siblings('li').removeClass('active');
  selectStream($stream.data().streamData);
  updateStreamStatus();
});

// skip button
$(document.body).on('click', '.skip', function(e) {
  skipSound();
});

// like button
$(document.body).on('click', '.like', function(e) {
  var track = currentStream.tracks[currentSoundNum];
  SC.put('/e1/me/track_likes/' + track.id, function(data) {
    console.log('saved to your likes!', data);
  })
});


function getCoverImage(track) {
  return (track.artwork_url || track.user.avatar_url).replace('large', 't300x300');
};

// playlist order control
var currentStream, currentSoundNum;
function selectStream(streamData) {
  if (currentStream === streamData) {
    playerToggle();
  } else {
    currentStream = streamData;
    currentSoundNum = 0;
    playerStartCurrent();
  }
}

function skipSound() {
  if (currentSoundNum < currentStream.tracks.length - 1) {
    currentSoundNum ++;
    playerStartCurrent();
    updateStreamStatus();
  }
}

function updateStreamStatus() {
  var $stream = $('#carte li.active');
  var track = currentStream.tracks[currentSoundNum];
  // change the cover image
  $stream.find('.cover').attr('src', getCoverImage(track));
  // check if the track is in my favorites
  $stream.find('.like').toggleClass('active', $.inArray(track.id, me.favoritesIds) >= 0);
  // change the window title so the tab looks better
  document.title = ['▶ ', track.title, ' by ', track.user.username].join();
};


// audio
var currenSoundInstance;
SC.whenStreamingReady(audioReady);

function audioReady() {
  console.log('Audio ready', this, arguments);
}


function playerStartCurrent () {
  var track = currentStream.tracks[currentSoundNum];
  currenSoundInstance && currenSoundInstance.pause();
  SC.stream('/tracks/' + track.id, {
    onfinish: skipSound
  }, function(sound){
    currenSoundInstance = sound;
    currenSoundInstance.play();
  });
}


function playerToggle() {
  currenSoundInstance.togglePause();
};