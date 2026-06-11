import React, { useState, useEffect, useRef } from 'react';
import Avatar from '../components/Avatar';
import confetti from 'canvas-confetti';

export default function Game({ roomState, roomId, socket, wordChoices, onSelectWord }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#f8fafc');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('pencil'); // pencil, eraser

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentTimer, setCurrentTimer] = useState(roomState.timer);
  const [obfuscatedWord, setObfuscatedWord] = useState(roomState.obfuscatedWord || '');
  const [typer, setTyper] = useState('');

  const isDrawer = roomState.drawerId === socket.id;

  // Real-time Canvas Alignment Matrix Initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Explicit fixed buffer to avoid interpolation gaps across mixed resolutions
    canvas.width = 700;
    canvas.height = 450;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Reset view background frame color space to slate black
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Sync stroke context dynamics update
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = tool === 'eraser' ? '#0f172a' : color;
    contextRef.current.lineWidth = brushSize;
  }, [color, brushSize, tool]);

  // Network Multi-Device Sync Socket Stream Subscriptions
  useEffect(() => {
    socket.on('draw', ({ x, y, lastX, lastY, toolColor, size }) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      ctx.beginPath();
      ctx.strokeStyle = toolColor;
      ctx.lineWidth = size;
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    socket.on('clearCanvas', () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('timerUpdate', (t) => setCurrentTimer(t));
    socket.on('hintUpdate', (h) => setObfuscatedWord(h));

    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('typingUpdate', ({ name, isTyping }) => {
      setTyper(isTyping ? `${name} is guessing...` : '');
    });

    // Cleanup bindings safely across view transitions
    return () => {
      socket.off('draw');
      socket.off('clearCanvas');
      socket.off('timerUpdate');
      socket.off('hintUpdate');
      socket.off('chatMessage');
      socket.off('typingUpdate');
    };
  }, [socket]);

  // Triggers confetti animations when state reports a complete win condition
  useEffect(() => {
    if (roomState.status === 'GAME_END') {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
    }
    setObfuscatedWord(roomState.obfuscatedWord);
  }, [roomState.status]);

  // Auto Scroll Chat Panel Engine
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Drawing event coordinate converters
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Map bounding element scale ratio logic accurately to virtual 700x450 grid matrix mapping
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Detect if it's a mobile touch event or standard mouse event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer || roomState.status !== 'DRAWING') return;
    const { x, y } = getCoordinates(e);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
    canvasRef.current._lastCoords = { x, y };
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer || roomState.status !== 'DRAWING') return;
    const { x, y } = getCoordinates(e);
    const last = canvasRef.current._lastCoords;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();

    // Broadcast Pipeline Stream
    socket.emit('draw', {
      roomId,
      data: {
        x,
        y,
        lastX: last.x,
        lastY: last.y,
        toolColor: tool === 'eraser' ? '#0f172a' : color,
        size: brushSize
      }
    });

    canvasRef.current._lastCoords = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('clearCanvas', { roomId });
  };

  // Chat handling
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('sendMessage', { roomId, message: chatInput.trim() });
    setChatInput('');
    socket.emit('typing', { roomId, isTyping: false });
  };

  const handleTypingChange = (e) => {
    setChatInput(e.target.value);
    socket.emit('typing', { roomId, isTyping: e.target.value.length > 0 });
  };

  // Dynamic status evaluation text strings definitions
  const currentDrawerName = roomState.players.find((p) => p.id === roomState.drawerId)?.name || 'Someone';

  return (
    <div className="w-full max-w-7xl flex flex-col gap-4 animate-fadeIn">
      {/* TOP HEADER: Game Details Metrics Status bar */}
      <div className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-center">
            <span className="block text-[10px] uppercase font-black tracking-widest text-slate-500">Round</span>
            <span className="text-xl font-mono font-bold text-slate-200">{roomState.currentRound} / {roomState.maxRounds}</span>
          </div>

          <div className="bg-slate-950 px-5 py-2 rounded-xl border border-slate-800 text-center min-w-16">
            <span className="block text-[10px] uppercase font-black tracking-widest text-slate-500">Timer</span>
            <span className={`text-xl font-mono font-black ${currentTimer <= 20 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              {currentTimer}s
            </span>
          </div>
        </div>

        {/* Word Display Panel Workspace info area */}
        <div className="flex-1 max-w-md text-center bg-slate-950/40 border border-slate-700/40 rounded-xl py-2 px-4">
          {roomState.status === 'WORD_SELECTING' ? (
            <p className="text-sm italic text-slate-400 font-medium">
              {isDrawer ? 'Select a word from choices below...' : `${currentDrawerName} is choosing a word...`}
            </p>
          ) : roomState.status === 'DRAWING' ? (
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs uppercase font-extrabold text-slate-500 tracking-widest mb-1">
                {isDrawer ? 'YOUR WORD TO DRAW' : 'GUESS THE WORD'}
              </span>
              <span className="text-2xl font-mono font-black tracking-[0.4em] text-cyan-400 uppercase select-none">
                {isDrawer ? roomState.obfuscatedWord : obfuscatedWord}
              </span>
            </div>
          ) : (
            <p className="text-sm font-bold text-amber-400">Interval Evaluation...</p>
          )}
        </div>

        <div className="text-right hidden md:block">
          <span className="block text-xs font-semibold text-slate-400">Current Phase:</span>
          <span className="text-sm font-black text-indigo-400 uppercase tracking-wider">{roomState.status}</span>
        </div>
      </div>

      {/* PRIMARY LOWER CONTAINER WINDOWS GRID SPACE */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* LEFT COMPONENT: Scoreboard Panel View (3 Columns) */}
        <div className="lg:col-span-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col shadow-lg max-h-[550px] overflow-y-auto">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-700/60 pb-2">
            Scoreboard Standings
          </h3>
          <div className="space-y-2 flex-1">
            {[...roomState.players].sort((a, b) => b.score - a.score).map((p, idx) => {
              const isPlayerDrawing = roomState.drawerId === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                    p.hasGuessed
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : isPlayerDrawing
                      ? 'bg-indigo-950/30 border-indigo-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="text-xs font-mono font-black text-slate-500 w-4 text-center">
                    #{idx + 1}
                  </div>
                  <Avatar name={p.name} size="sm" />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-bold text-slate-200 truncate flex items-center gap-1.5">
                      {p.name}
                      {isPlayerDrawing && <span className="text-[9px] uppercase font-bold bg-indigo-500/30 text-indigo-300 px-1 rounded">Draw</span>}
                    </div>
                    <span className="text-xs font-mono text-slate-400">{p.score} pts</span>
                  </div>
                  {p.hasGuessed && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      ✓ Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COMPONENT: Active Canvas Board Box (6 Columns) */}
        <div className="lg:col-span-6 flex flex-col gap-3 relative">
          <div className="w-full bg-slate-950 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl relative aspect-[700/450]">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              
              // Mobile Touch Event Bindings
              onTouchStart={(e) => {
                startDrawing(e);
              }}
              onTouchMove={(e) => {
                // Prevents the browser from dragging/scrolling the page while drawing
                if (e.cancelable) e.preventDefault(); 
                draw(e);
              }}
              onTouchEnd={stopDrawing}
              
              className={`w-full h-full block bg-slate-950 ${isDrawer && roomState.status === 'DRAWING' ? 'cursor-crosshair touch-none' : 'cursor-not-allowed'}`}
            />

            {/* OVERLAY MATRIX MAPPING FOR INTERIM SELECTION OR EVALUATION PHASES */}
            {roomState.status === 'WORD_SELECTING' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
                {isDrawer ? (
                  <div className="max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-xl font-black text-indigo-400 tracking-wide mb-2">PICK A WORD TO DRAW</h3>
                    <p className="text-xs text-slate-400 mb-6">Your quick pick will determine your target strategy matrix:</p>
                    <div className="flex flex-col gap-2.5">
                      {wordChoices.map((word) => (
                        <button
                          key={word}
                          onClick={() => onSelectWord(word)}
                          className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-800 hover:bg-indigo-600 border border-slate-700 text-slate-200 transition-all cursor-pointer shadow active:scale-[0.98]"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-t-indigo-500 border-slate-800 rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-300 font-medium">Waiting for <span className="text-indigo-400 font-bold">{currentDrawerName}</span> to pick a secret subject...</p>
                  </div>
                )}
              </div>
            )}

            {roomState.status === 'ROUND_END' && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
                <div className="p-6 bg-slate-900/90 border border-slate-700 rounded-2xl max-w-xs shadow-2xl">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400 block mb-1">Interval Terminated</span>
                  <h3 className="text-2xl font-black text-slate-100 tracking-wide mb-2">ROUND OVER</h3>
                  <p className="text-sm text-slate-400">The hidden answer was:</p>
                  <p className="text-xl font-mono font-black text-cyan-400 border border-slate-800 bg-slate-950 py-2 rounded-xl mt-3 tracking-wider uppercase">
                    {roomState.obfuscatedWord}
                  </p>
                </div>
              </div>
            )}

            {roomState.status === 'GAME_END' && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
                <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                  <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 tracking-wider mb-2">ARENA FINISHED</h3>
                  <p className="text-xs text-slate-400 mb-6">Final Leaderboard Metrics</p>
                  
                  <div className="space-y-2 mb-6 text-left">
                    {[...roomState.players]
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 3)
                      .map((p, index) => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className={`text-sm font-mono font-black w-6 text-center ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : 'text-amber-600'}`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                          <Avatar name={p.name} size="sm" />
                          <span className="text-sm font-bold text-slate-200 flex-1 truncate">{p.name}</span>
                          <span className="text-sm font-mono font-black text-indigo-400">{p.score} pts</span>
                        </div>
                      ))}
                  </div>

                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Return to Main Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CANVAS BOTTOM CONTROLS DRAWING BAR */}
          {isDrawer && roomState.status === 'DRAWING' && (
            <div className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-md animate-slideUp">
              {/* Palette Sets */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {['#f8fafc', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setTool('pencil'); }}
                    className={`w-6 h-6 rounded-md cursor-pointer transition-transform active:scale-90 ${color === c && tool === 'pencil' ? 'ring-2 ring-indigo-400 scale-110 z-10' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Utility Tools */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setTool('pencil')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tool === 'pencil' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Pencil
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Eraser
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Size</span>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-20 accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300 w-5 text-right">{brushSize}</span>
                </div>

                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/20 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Clear Canvas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: Real-time Guessing Chat Box (3 Columns) */}
        <div className="lg:col-span-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl flex flex-col shadow-lg overflow-hidden h-[450px] lg:h-auto">
          <div className="p-3 bg-slate-950 border-b border-slate-700/60 font-black text-xs uppercase tracking-widest text-slate-400">
            Live Stream Feed
          </div>

          {/* Core messages box stream mapping */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-950/20 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className="leading-relaxed break-words">
                <span className="font-extrabold text-indigo-400 mr-1.5">{m.sender}:</span>
                <span className="text-slate-300 font-medium">{m.text}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Typing Indicator Label Container wrapper box */}
          {typer && (
            <div className="px-3 py-1 text-[11px] font-medium italic text-cyan-400 bg-slate-950/40 border-t border-slate-800">
              {typer}
            </div>
          )}

          {/* User Input controls form container */}
          <form onSubmit={handleSendChat} className="p-2 bg-slate-950 border-t border-slate-700/60 flex gap-2">
            <input
              type="text"
              disabled={isDrawer || roomState.status !== 'DRAWING' || roomState.players.find(p => p.id === socket.id)?.hasGuessed}
              value={chatInput}
              onChange={handleTypingChange}
              placeholder={isDrawer ? "You are drawing..." : "Type your guess here..."}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            />
            <button
              type="submit"
              disabled={isDrawer || roomState.status !== 'DRAWING' || roomState.players.find(p => p.id === socket.id)?.hasGuessed || !chatInput.trim()}
              className="py-2 px-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/20 text-xs text-white transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              Guess
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}