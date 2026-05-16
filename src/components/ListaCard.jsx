import React, { useState, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Trash2,
  MoreVertical,
  Pencil,
  ClipboardPaste,
  X,
} from 'lucide-react';
import { detectCategory, CATEGORIES, DEFAULT_CATEGORY } from '../categoryEngine';

// Agrupa itens por categoria
function groupByCategory(items) {
  const groups = {};
  items.forEach((item) => {
    const cat = detectCategory(item.text);
    if (!groups[cat.id]) {
      groups[cat.id] = { category: cat, items: [] };
    }
    groups[cat.id].items.push(item);
  });
  return Object.values(groups);
}

// Chip de filtro de categoria
function CategoryChip({ category, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`category-chip btn-ripple flex-shrink-0 ${
        active
          ? `${category.bgClass} ${category.borderClass} ${category.textClass}`
          : 'bg-slate-100 border-slate-200 text-slate-500'
      }`}
    >
      <span>{category.emoji}</span>
      <span>{category.label}</span>
    </button>
  );
}

// Componente de item individual
function ListItem({ item, onToggle, onRemove, onEdit }) {
  const [bouncing, setBouncing] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef(null);
  const category = detectCategory(item.text);

  const handleToggle = useCallback(() => {
    setBouncing(true);
    setFlashing(true);
    setTimeout(() => setBouncing(false), 500);
    setTimeout(() => setFlashing(false), 400);
    onToggle(item.id);
  }, [item.id, onToggle]);

  const handleStartEdit = () => {
    setEditText(item.text);
    setEditing(true);
    setMenuOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onEdit(item.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') { setEditing(false); setEditText(item.text); }
  };

  return (
    <li
      className={`list-item divider-subtle ${flashing ? 'animate-haptic' : ''} ${
        item.checked ? 'list-item-checked' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div
          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
          onClick={editing ? undefined : handleToggle}
        >
          <span className={bouncing ? 'animate-check-bounce' : ''}>
            {item.checked ? (
              <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle size={22} className="text-slate-600 flex-shrink-0" />
            )}
          </span>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          ) : (
            <span
              className={`text-sm leading-snug truncate ${
                item.checked
                  ? 'line-through text-slate-400'
                  : 'text-slate-700'
              }`}
            >
              {item.text}
            </span>
          )}
        </div>

        {/* Menu de ações (⋮) */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors btn-ripple rounded-lg"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[150px]" style={{ animation: 'fadeIn .15s ease' }}>
                <button
                  onClick={handleStartEdit}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={14} className="text-emerald-500" />
                  Editar nome
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onRemove(item.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ListaCard({
  items,
  listId,
  pasteText,
  setPasteText,
  onProcessText,
  onToggleItem,
  onRemoveItem,
  onEditItem,
  onClearChecked,
}) {
  const [activeFilter, setActiveFilter] = useState(null); // null = todos
  const textareaRef = useRef(null);

  // Categorias que realmente aparecem nos itens
  const presentCategoryIds = [...new Set(items.map((i) => detectCategory(i.text).id))];
  const presentCategories = [
    ...(presentCategoryIds.includes('outros') ? [DEFAULT_CATEGORY] : []),
    ...CATEGORIES.filter((c) => presentCategoryIds.includes(c.id)),
  ];

  // Filtragem por categoria ativa
  const filteredItems = activeFilter
    ? items.filter((i) => detectCategory(i.text).id === activeFilter)
    : items;

  // Itens não marcados primeiro
  const sortedFiltered = [...filteredItems].sort((a, b) => a.checked - b.checked);

  // Agrupamento para exibição (somente quando "Todos" selecionado)
  const grouped = activeFilter ? null : groupByCategory(sortedFiltered);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <section className="card-premium overflow-hidden">
      {/* Header do card */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <ClipboardPaste size={16} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm leading-none">Lista Compartilhada</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">#{listId}</p>
          </div>
        </div>
        {checkedCount > 0 && (
          <button
            onClick={onClearChecked}
            className="flex items-center gap-1 text-[11px] text-red-400/80 hover:text-red-400 font-medium transition-colors btn-ripple px-2 py-1 rounded-lg"
          >
            <X size={12} /> Limpar pegos
          </button>
        )}
      </div>

      {/* Input para colar lista */}
      <div className="p-4 space-y-3">
        <textarea
          ref={textareaRef}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 resize-none transition-all"
          rows={3}
          placeholder="Cole aqui a lista do WhatsApp..."
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <button
          onClick={onProcessText}
          disabled={!pasteText.trim()}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/30 btn-ripple active:scale-[0.98] text-sm"
        >
          Adicionar à Lista
        </button>
      </div>

      {/* Área de itens */}
      {items.length > 0 && (
        <div className="border-t border-slate-100">
          {/* Contador */}
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              {checkedCount} de {items.length} pegos
            </span>
            {/* Barra de progresso */}
            <div className="flex-1 mx-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: items.length > 0 ? `${(checkedCount / items.length) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Chips de filtro de categoria */}
          {presentCategories.length > 1 && (
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto slim-scroll">
              <button
                onClick={() => setActiveFilter(null)}
                className={`category-chip btn-ripple flex-shrink-0 ${
                  !activeFilter
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                🛒 Todos
              </button>
              {presentCategories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  category={cat}
                  active={activeFilter === cat.id}
                  onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
                />
              ))}
            </div>
          )}

          {/* Lista de itens */}
          <ul className="max-h-80 overflow-y-auto slim-scroll">
            {activeFilter || !grouped
              ? // Modo filtrado: lista plana
                sortedFiltered.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    onToggle={onToggleItem}
                    onRemove={onRemoveItem}
                    onEdit={onEditItem}
                  />
                ))
              : // Modo todos: agrupado por categoria
                grouped.map(({ category, items: catItems }) => (
                  <React.Fragment key={category.id}>
                    {/* Header de categoria */}
                    <div
                      className={`category-header ${category.bgClass} ${category.borderClass} ${category.textClass}`}
                      style={{ borderBottomColor: `${category.glowColor}` }}
                    >
                      <span>{category.emoji}</span>
                      <span>{category.label}</span>
                      <span className="ml-auto opacity-60">{catItems.length}</span>
                    </div>
                    {[...catItems]
                      .sort((a, b) => a.checked - b.checked)
                      .map((item) => (
                        <ListItem
                          key={item.id}
                          item={item}
                          onToggle={onToggleItem}
                          onRemove={onRemoveItem}
                          onEdit={onEditItem}
                        />
                      ))}
                  </React.Fragment>
                ))}
          </ul>
        </div>
      )}
    </section>
  );
}
