'use strict';

function Game() {
    //this.time;
    this.score = 0;
    this.scoreText = document.getElementById('score_text');
    this.isStarted = false;
    this.game_over = false;

    this.timer = {
        inteval: undefined,
        countFrom: 60, //sec
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
             // update the view
            if(this.count <= 9) this.progressView.innerHTML = "00:0" + this.count;
            else this.progressView.innerHTML = "00:" + this.count;
           
            if(this.count <= 0) {
                this.count = 0;
                clearInterval(this.interval);
                game.gameOver();
            }
            
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
        this.game_over = true;
        this.timer.Stop();
        document.getElementById('gameOver').style.display = 'block';
    }
}

Game.prototype.makeScore = function() {
    this.score = this.score+1;
    this.scoreText.innerHTML = this.score.toString();
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