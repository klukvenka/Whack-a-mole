'use strict';

function Game() {
    //this.time;
    this.score = 0;
    this.isStarted = false;

    this.timer = {
        inteval: undefined,
        countFrom: 10, //sec
        count: this.countFrom,
        progressView: document.getElementById('timer'),
        
        Restart: function() {
            if(this.interval) {
                clearInterval(this.interval);
            }
            this.count = this.countFrom;
            this.interval = setInterval((this.tick).bind(this), 1000);
        },
        Stop: function() {
            clearInterval(this.interval);
        },
        tick: function() {
            this.count -=1;
            if(this.count <= 0) {
                this.count = 0;
                clearInterval(this.interval);
                game.gameOver();
            }
            // update the view
            var progress = this.count / this.countFrom * 100;    
            this.progressView.innerHTML = progress + "%";
            console.log(this.progressView.style.width = progress + "%");

        } 

    }

}

Game.prototype.Start = function() {
    if(!this.isStarted) {
        this.isStarted = true;
        this.timer.Restart();

    }
}

Game.prototype.gameOver = function() {
    if(this.isStarted) {
        this.isStarted = false;
        this.timer.Stop();
        document.getElementById('gameOver').style.display = 'block';
    }
}


// function Timer() {
//     this.interval = undefined;
//     this.countFrom = 60; // sec
//     this.count = this.countFrom;
//     this.progressiveView = document.getElementById('timer');
// }

// Timer.prototype.Restart = function() {
//     if(this.interval) {
//         clearInterval(this.interval);
//     }
//     this.count = this.countFrom;
//     this.interval = setInterval((this.tick).bind(this), 1000);
// }

// Timer.prototype.Stop = function() {
//     clearInterval(this.interval);
// }

// Timer.prototype.tick = function() {
//     this.count -=1;
//     if(this.count <= 0) {
//         this.count = 0;
//         clearInterval(this.interval);
//     }
// }