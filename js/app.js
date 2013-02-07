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
    // choose an interesting friend
    var randomLiker = autoChoose(me.followings, function(f) { return f.public_favorites_count > 10 });
    var randomFriend = autoChoose(me.followings, function(f) { return f.track_count > 10 });
    // somebodies likes
    displayStream.apply({title: randomLiker.username + '\'s Likes', url: '/users/' + randomLiker.id + '/favorites'});
    // somebodies tracks
    displayStream.apply({title: randomFriend.username + '\'s Sounds', url: '/users/' + randomFriend.id + '/tracks'});
    //console.log('my friends!', data);
  });

  SC.get('/me/groups/', function(data) {
    me.groups = data;
    var randomGroup = autoChoose(me.groups);
    displayStream.apply({title: randomGroup.name + ' Group', url: '/groups/' + randomGroup.id + '/tracks'});
    // console.log('my groups!', data);
  });

  SC.get('/me/favorites/', {limit: 5000},function(data) {
    me.favorites = data;
    me.favoritesIds = $.map(me.favorites, function(f) {
      return f.id;
    });
    // console.log('my favorites!', data);
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

function setupStreams() {
	

	var streams = [
    {title: 'My likes', url: '/me/favorites', randomize: true},
    {title: 'Latest sounds', url: '/me/activities', randomize: true},
    {title: 'Shared to me', url: '/me/activities/tracks/exclusive', randomize: true},
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
  me.favoritesIds.push(track.id);
  toggleIfLiked($(this), track);
});

$(window).on('keypress', function(event) {
  var key = event.keyCode;
  if (key === 32) {
    event.preventDefault();
    playerToggle();
  } else if (key === 106) {
    skipSound();
  } else if (key === 107) {
    skipSound(-1);
  }
});


var defaultImage = 'https://a2.sndcdn.com/assets/images/default/cloudx200-1ec56ce9.png';

function getCoverImage(track) {
  return (track.artwork_url || (track.user ? track.user.avatar_url : defaultImage)).replace('large', 't300x300');
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

function skipSound(back) {
  if (back && currentSoundNum > 0) {
    currentSoundNum --;
    playerStartCurrent();
   
  } else if (currentSoundNum < currentStream.tracks.length - 1) {
    currentSoundNum ++;
    playerStartCurrent();
   
  }
}

function updateStreamStatus() {
  var $stream = $('#carte li.active');
  var track = currentStream.tracks[currentSoundNum];
  // change the cover image
  $stream.find('.cover').attr('src', getCoverImage(track));
  // like button
  toggleIfLiked($stream.find('.like'), track);
  // change the window title so the tab looks better
  document.title = ['▶ ', track.title].join();
};

function toggleIfLiked($node, track) {
  // check if the track is in my favorites
  $node.toggleClass('active', $.inArray(track.id, me.favoritesIds) >= 0);
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
    onfinish: skipSound,
    onplay: updateStreamStatus
  }, function(sound){
    currenSoundInstance = sound;
    currenSoundInstance.play();
  });
}


function playerToggle() {
  currenSoundInstance.togglePause();
};