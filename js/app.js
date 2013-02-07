// SoundCloud code

SC.initialize({
  client_id: "9bee1c02578a1de5a3221134169dd2bb",
  redirect_uri: "http://localhost:8000/callback.html",
});


$(function() {
	$('#login').on('click', function(e){
		console.log('click', e)
		SC.connect(function(){
			$('.login-form').hide();
			setupStreams();
		});
	});
});


function setupStreams(user) {
	

	var streams = [
    {title: 'My likes', url: '/me/favorites', randomize: true},
    {title: 'Tracks shared to me', url: '/me/activities/tracks/exclusive'},
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

$(document.body).on('click', '.cover', function(e) {
  var $stream = $(this).closest('li');
  $stream.addClass('active').siblings('li').removeClass('active');
  selectStream($stream.data().streamData);
});


$(document.body).on('click', '.skip', function(e) {
  skipSound();
});

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
  $stream.find('.cover').attr('src', getCoverImage(track));

  document.title = ['', track.title, ' by ', track.user.username].join();
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