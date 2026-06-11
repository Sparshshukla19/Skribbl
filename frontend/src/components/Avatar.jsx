import React from 'react';

export default function Avatar({ name, size = 'md' }) {
  const initials = name ? name.substring(0, 2).toUpperCase() : '??';
  
  // Deterministic background hashing for consistent player identification
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-11 h-11 text-sm';

  return (
    <div className={`${dim} ${colorClass} text-white font-bold rounded-full flex items-center justify-center border-2 border-slate-700 shadow-inner shrink-0`}>
      {initials}
    </div>
  );
}