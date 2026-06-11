import { getRandomWords } from '../utils/words.js';

export class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = []; // Array of { id, name, score, isHost, hasGuessed, roundScore }
    this.status = 'LOBBY'; // LOBBY, WORD_SELECTING, DRAWING, ROUND_END, GAME_END
    this.currentRound = 0;
    this.maxRounds = 3;
    this.drawerIndex = 0;
    this.currentWord = '';
    this.wordChoices = [];
    this.hintIndices = new Set();
    this.timer = 80;
    this.timerInterval = null;
    this.correctGuessesThisRound = 0;
  }

  addPlayer(id, name, isHost = false) {
    this.players.push({
      id,
      name,
      score: 0,
      isHost,
      hasGuessed: false,
      roundScore: 0
    });
  }

  removePlayer(id) {
    const index = this.players.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const removedPlayer = this.players[index];
    this.players.splice(index, 1);

    // Reassign host if needed
    if (removedPlayer.isHost && this.players.length > 0) {
      this.players[0].isHost = true;
    }

    // Fix drawer index if out of bounds
    if (this.drawerIndex >= this.players.length) {
      this.drawerIndex = 0;
    }

    return removedPlayer;
  }

  getDrawer() {
    return this.players[this.drawerIndex] || null;
  }

  startWordSelection(io) {
    this.status = 'WORD_SELECTING';
    this.players.forEach(p => p.hasGuessed = false);
    this.correctGuessesThisRound = 0;
    this.wordChoices = getRandomWords(3);
    this.hintIndices.clear();

    const drawer = this.getDrawer();
    if (!drawer) return;

    io.to(this.id).emit('roomStateUpdate', this.toPublicState());
    
    // Explicitly send word options directly to drawer
    io.to(drawer.id).emit('wordChoices', this.wordChoices);
  }

  startDrawing(word, io) {
    this.status = 'DRAWING';
    this.currentWord = word.toUpperCase();
    this.timer = 80;

    io.to(this.id).emit('roomStateUpdate', this.toPublicState());
    io.to(this.id).emit('clearCanvas');

    this.startTimer(io);
  }

  startTimer(io) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timer--;

      // Provide Hints
      if (this.timer === 40) {
        this.revealHint();
        io.to(this.id).emit('hintUpdate', this.getObfuscatedWord());
      }
      if (this.timer === 20) {
        this.revealHint();
        io.to(this.id).emit('hintUpdate', this.getObfuscatedWord());
      }

      io.to(this.id).emit('timerUpdate', this.timer);

      if (this.timer <= 0) {
        this.endRound(io);
      }
    }, 1000);
  }

  revealHint() {
    if (!this.currentWord) return;
    const availableIndices = [];
    for (let i = 0; i < this.currentWord.length; i++) {
      if (!this.hintIndices.has(i) && this.currentWord[i] !== ' ') {
        availableIndices.push(i);
      }
    }
    if (availableIndices.length > 0) {
      const randIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      this.hintIndices.add(randIdx);
    }
  }

  getObfuscatedWord() {
    return this.currentWord
      .split('')
      .map((char, index) => {
        if (char === ' ') return ' ';
        return this.hintIndices.has(index) ? char : '_';
      })
      .join('');
  }

  handleGuess(playerId, text, io) {
    if (this.status !== 'DRAWING') return false;
    
    const player = this.players.find(p => p.id === playerId);
    const drawer = this.getDrawer();
    if (!player || player.hasGuessed || player.id === drawer?.id) return false;

    if (text.trim().toUpperCase() === this.currentWord) {
      player.hasGuessed = true;
      this.correctGuessesThisRound++;

      // Scale Points Matrix
      let scoreEarned = 60;
      if (this.correctGuessesThisRound === 1) scoreEarned = 100;
      else if (this.correctGuessesThisRound === 2) scoreEarned = 80;

      player.score += scoreEarned;

      // Drawers get incremental bonuses
      if (drawer) {
        drawer.score += 20;
      }

      io.to(this.id).emit('systemMessage', {
        text: `${player.name} guessed the word!`,
        type: 'success'
      });

      io.to(this.id).emit('roomStateUpdate', this.toPublicState());

      // If everyone guessed, end round immediately
      const totalGuessers = this.players.length - 1;
      if (this.correctGuessesThisRound >= totalGuessers) {
        this.endRound(io);
      }
      return true;
    }
    return false;
  }

  endRound(io) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.status = 'ROUND_END';

    io.to(this.id).emit('systemMessage', {
      text: `Round Over! The word was: ${this.currentWord}`,
      type: 'info'
    });

    io.to(this.id).emit('roomStateUpdate', this.toPublicState());

    setTimeout(() => {
      // Progress turning logic
      this.drawerIndex++;
      if (this.drawerIndex >= this.players.length) {
        this.drawerIndex = 0;
        this.currentRound++;
      }

      if (this.currentRound >= this.maxRounds) {
        this.status = 'GAME_END';
        io.to(this.id).emit('roomStateUpdate', this.toPublicState());
      } else {
        this.startWordSelection(io);
      }
    }, 4000);
  }

  toPublicState() {
    return {
      id: this.id,
      players: this.players,
      status: this.status,
      currentRound: this.currentRound + 1,
      maxRounds: this.maxRounds,
      drawerId: this.getDrawer()?.id || null,
      obfuscatedWord: this.getObfuscatedWord(),
      timer: this.timer
    };
  }
}