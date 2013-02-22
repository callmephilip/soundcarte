(function(SC){
    
    //TODO: load SC properly

    define(["underscore", "backbone"], function(_,Backbone){

        var __instance = {
            playerToggle : playerToggle,
            playerStartCurrent : playerStartCurrent,
            events : new _.extend(Backbone.Events,{}),
            currentStream : null, 
            currentSoundNum : null,
            currenSoundInstance : null
        };

        SC.whenStreamingReady(audioReady);

        function audioReady() {
          console.log('Audio ready', this, arguments);
        }

        function onPause() {
          updateTitle(false);
        }

        function onResume() {
          updateTitle(true);
        }

        function playerStartCurrent () {
          var track = __instance.currentStream.tracks[__instance.currentSoundNum];
          
          __instance.currenSoundInstance && __instance.currenSoundInstance.pause();
          
          SC.stream('/tracks/' + track.id, {
            onfinish: function(){ __instance.events.trigger("finish"); },
            onplay: function(){ __instance.events.trigger("play"); },
            onpause: function(){ __instance.events.trigger("pause"); },
            onresume: function(){ __instance.events.trigger("resume"); }
          }, function(sound){
            __instance.currenSoundInstance = sound;
            __instance.currenSoundInstance.play();
          });
        }


        function playerToggle() {
          __instance.currenSoundInstance.togglePause();
        };


        return __instance;

    });

}(SC));

