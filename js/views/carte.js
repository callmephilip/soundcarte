define(["jquery","backbone", "handlebars","text!templates/carte.html"],

    function($,Backbone,Handlebars,carteTemplate){


        var Carte = Backbone.View.extend({

            template : Handlebars.compile(carteTemplate),

            events : {
                "click h1" : "onBackToOverview",
                'click .play' : "onPlay",

                //not sure what this one does 
                'click .active h3, .active .cover' : "onToggleStream",

                'click .skip' : "onSkip",
                'click .back' : "onBack",

                'click .like' : "onLike"
            },

            render : function(){
                $(this.el).html(this.template({}));
                return this.el;
            },

            onBackToOverview : function(e){
                e.preventDefault();
                $(document.body).toggleClass('selected', false);
                $('#current-stream').text('');
            },

            onPlay : function(e){
                e.preventDefault();
                var $stream = $(e.target).closest('li');
                var streamData = $stream.data().streamData;
                $stream
                    .addClass('active')
                    .siblings('li')
                    .removeClass('active');
                

                this.trigger("play-stream",streamData);
            },

            onToggleStream : function(e){
                var streamData = $(e.target).closest('li').data().streamData;
                this.trigger("toggle-stream",streamData);
            },

            onSkip : function(e){
                e.preventDefault();
                this.trigger("skip");
            },

            onBack : function(e){
                e.preventDefault();
                this.trigger("back");
            },

            onLike : function(e){
                e.preventDefault();
                this.trigger("like",e);
            }
        });

        return Carte;

});