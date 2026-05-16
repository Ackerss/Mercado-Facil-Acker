import React from 'react';
import { X, Plus, Clock, Trash2 } from 'lucide-react';

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins <= 1 ? 'Agora mesmo' : `${mins} min atrás`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h atrás`;
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoricoModal({
  show,
  onClose,
  history,
  currentListId,
  onOpenList,
  onNewList,
  onRemoveFromHistory,
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeIn .2s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Clock size={16} className="text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-800">Histórico de Listas</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nova Lista */}
        <div className="px-5 py-3 border-b border-slate-100">
          <button
            onClick={onNewList}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] text-sm flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Nova Lista (ir ao mercado sozinho)
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma lista no histórico</p>
              <p className="text-xs mt-1">Suas listas aparecerão aqui</p>
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  entry.id === currentListId
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                }`}
              >
                <button
                  onClick={() => onOpenList(entry.id)}
                  className="flex-1 text-left flex items-center gap-3 min-w-0"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700 font-mono truncate">
                        #{entry.id}
                      </span>
                      {entry.id === currentListId && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase flex-shrink-0">
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">
                        {formatDate(entry.lastUsed)}
                      </span>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {entry.itemCount} {entry.itemCount === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>
                </button>
                {entry.id !== currentListId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromHistory(entry.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded-lg flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom safe area */}
        <div className="h-2 sm:h-0" />
      </div>
    </div>
  );
}
