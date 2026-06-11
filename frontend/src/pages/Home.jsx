import React, { useState } from 'react';

export default function Home({ onCreate, onJoin }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const submitCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
  };

  const submitJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    onJoin(name.trim(), code.trim());
  };

  return (
    <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 drop-shadow">
          SKRIBBL.NET
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Real-time drawing & architectural guess engine</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Your Nickname
          </label>
          <input
            type="text"
            maxLength={14}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter alias..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <hr className="border-slate-700/60" />

        <form onSubmit={submitCreate}>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 disabled:text-slate-500 text-white transition-all shadow-lg cursor-pointer shadow-indigo-600/20 active:scale-[0.99]"
          >
            Create Private Room
          </button>
        </form>

        <div className="relative flex py-2 items-center text-slate-600">
          <div className="flex-grow border-t border-slate-700/60"></div>
          <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest text-slate-500">OR</span>
          <div className="flex-grow border-t border-slate-700/60"></div>
        </div>

        <form onSubmit={submitJoin} className="space-y-3">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || !code.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 disabled:text-slate-500 text-white transition-all shadow-lg cursor-pointer shadow-emerald-600/20 active:scale-[0.99]"
          >
            Join Existing Room
          </button>
        </form>
      </div>
    </div>
  );
}