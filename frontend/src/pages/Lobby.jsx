import React from 'react';
import Avatar from '../components/Avatar';

export default function Lobby({ roomState, roomId, socketId, onStart }) {
  const self = roomState.players.find((p) => p.id === socketId);
  const isHost = self?.isHost;
  const canStart = roomState.players.length >= 2;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
  };

  return (
    <div className="w-full max-w-2xl bg-slate-800/90 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col">
      {/* Header Panel */}
      <div className="p-6 bg-slate-950 border-b border-slate-700/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-200 tracking-wide">MATCH LOBBY</h2>
          <p className="text-xs text-slate-400 mt-1">Gather crew members before starting</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 px-4">
          <span className="text-xs font-bold text-slate-500 font-mono tracking-tight">ROOM CODE:</span>
          <span className="text-lg font-mono font-black text-emerald-400 tracking-widest">{roomId}</span>
          <button
            onClick={copyRoomCode}
            className="ml-2 p-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 active:scale-95 transition-all cursor-pointer"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Players list matrix mapping */}
      <div className="p-6 flex-1 min-h-[240px]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Connected Squad ({roomState.players.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roomState.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                p.id === socketId
                  ? 'bg-slate-900 border-indigo-500/50'
                  : 'bg-slate-900/40 border-slate-700/60'
              }`}
            >
              <Avatar name={p.name} />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-200 truncate flex items-center gap-2">
                  {p.name}
                  {p.id === socketId && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-normal">You</span>}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Ready</p>
              </div>
              {p.isHost && (
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Control Actions footer layout */}
      <div className="p-4 bg-slate-950 border-t border-slate-700/60 text-right flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">
          {!canStart ? '⚠️ Minimal requirement: 2 players.' : '✅ Ready to deploy execution sequence.'}
        </span>
        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="py-2.5 px-6 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/20 disabled:text-slate-600 text-white transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed"
          >
            Launch Arena Game
          </button>
        ) : (
          <div className="text-xs font-medium text-slate-400 animate-pulse bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
            Waiting for host to initialize...
          </div>
        )}
      </div>
    </div>
  );
}