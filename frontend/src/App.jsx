import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

const SOCKET_SERVER = import.meta.env.VITE_WS_SERVER || 'http://localhost:5000';;
let socket;

export default function App() {
  const [roomState, setRoomState] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [wordChoices, setWordChoices] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    socket = io(SOCKET_SERVER);

    socket.on('roomJoined', ({ roomId, state }) => {
      setRoomId(roomId);
      setRoomState(state);
    });

    socket.on('roomStateUpdate', (state) => {
      setRoomState(state);
      if (state.status !== 'WORD_SELECTING') {
        setWordChoices([]);
      }
    });

    socket.on('wordChoices', (choices) => {
      setWordChoices(choices);
    });

    socket.on('systemMessage', (msg) => {
      addToast(msg.text, msg.type);
    });

    socket.on('errorNotification', (err) => {
      addToast(err, 'error');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addToast = (text, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleCreateRoom = (name) => {
    setNickname(name);
    socket.emit('createRoom', { name });
  };

  const handleJoinRoom = (name, code) => {
    setNickname(name);
    socket.emit('joinRoom', { roomId: code.toUpperCase(), name });
  };

  const handleStartGame = () => {
    if (roomId) socket.emit('startGame', { roomId });
  };

  const handleSelectWord = (word) => {
    if (roomId) socket.emit('chooseWord', { roomId, word });
    setWordChoices([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Toast Engine */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3 rounded-lg shadow-xl border text-sm font-medium animate-bounce-short transition-all ${
              t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
              t.type === 'error' ? 'bg-rose-950/90 border-rose-500 text-rose-200' :
              t.type === 'join' ? 'bg-indigo-950/90 border-indigo-500 text-indigo-200' :
              t.type === 'leave' ? 'bg-amber-950/90 border-amber-500 text-amber-200' :
              'bg-slate-800/95 border-slate-600 text-slate-100'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Navigation Router Matrix */}
      {!roomState && (
        <Home onCreate={handleCreateRoom} onJoin={handleJoinRoom} />
      )}

      {roomState && roomState.status === 'LOBBY' && (
        <Lobby 
          roomState={roomState} 
          roomId={roomId} 
          socketId={socket.id} 
          onStart={handleStartGame} 
        />
      )}

      {roomState && roomState.status !== 'LOBBY' && (
        <Game 
          roomState={roomState} 
          roomId={roomId} 
          socket={socket} 
          wordChoices={wordChoices}
          onSelectWord={handleSelectWord}
        />
      )}
    </div>
  );
}