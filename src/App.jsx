import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Share2,
  History 
} from 'lucide-react';
import { auth, db, signInAnonymously } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Componentes Premium
import ListaCard from './components/ListaCard';
import RacharCard from './components/RacharCard';
import HistoricoModal from './components/HistoricoModal';

// --- Persistência de histórico (localStorage) ---
const LAST_LIST_KEY = 'mercado_facil_last_list_id';
const HISTORY_KEY = 'mercado_facil_list_history';
const MAX_HISTORY = 10;

function getLastListId() {
  return localStorage.getItem(LAST_LIST_KEY);
}
function saveLastListId(id) {
  localStorage.setItem(LAST_LIST_KEY, id);
}
function getHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}
function updateHistoryEntry(id, itemCount) {
  let history = getHistory();
  history = history.filter(h => h.id !== id);
  history.unshift({ id, lastUsed: Date.now(), itemCount });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
function removeHistoryEntry(id) {
  let history = getHistory();
  history = history.filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

const initialBuyers = [
  { id: '1', name: 'Família 1', heads: 4 },
  { id: '2', name: 'Família 2', heads: 3 },
  { id: '3', name: 'Família 3', heads: 2 },
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados locais (sincronizados com a nuvem)
  const [pasteText, setPasteText] = useState('');
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState('');
  const [buyers, setBuyers] = useState(initialBuyers);
  
  // ID da lista (vinda da URL ou gerada)
  const [listId, setListId] = useState('');
  const [showHistorico, setShowHistorico] = useState(false);
  const [listHistory, setListHistory] = useState([]);

  useEffect(() => {
    // Gerenciar ID da Lista — com proteção contra perda
    const params = new URLSearchParams(window.location.search);
    let currentId = params.get('list');
    
    if (!currentId) {
      // 1) Tenta recuperar o último ID do localStorage
      currentId = getLastListId();
    }
    if (!currentId) {
      // 2) Nada salvo — gera um novo
      currentId = crypto.randomUUID().split('-')[0];
    }

    // Atualiza URL e persiste no localStorage
    params.set('list', currentId);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    saveLastListId(currentId);
    setListId(currentId);

    // Autenticação Anônima
    signInAnonymously(auth)
      .then((cred) => setUser(cred.user))
      .catch((err) => {
        console.error("Erro auth:", err);
        setError("Erro ao conectar ao servidor.");
      });
  }, []);

  useEffect(() => {
    if (!user || !listId) return;

    const docRef = doc(db, 'mercado_lists', listId);

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setItems(data.items || []);
        setBuyers(data.buyers || initialBuyers);
        setTotalAmount(data.totalAmount || '');
      } else {
        setDoc(docRef, { items: [], buyers: initialBuyers, totalAmount: '' });
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro sync:", err);
      setError("Sem permissão ou erro de rede.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, listId]);

  // Atualiza o histórico sempre que a lista muda
  useEffect(() => {
    if (listId) {
      updateHistoryEntry(listId, items.length);
    }
  }, [items, listId]);

  const updateSharedState = async (updates) => {
    if (!user || !listId) return;
    const docRef = doc(db, 'mercado_lists', listId);
    
    const currentData = {
      items: updates.items !== undefined ? updates.items : items,
      buyers: updates.buyers !== undefined ? updates.buyers : buyers,
      totalAmount: updates.totalAmount !== undefined ? updates.totalAmount : totalAmount
    };

    try {
      await setDoc(docRef, currentData);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  // --- Handlers para ListaCard ---
  const handleProcessText = () => {
    if (!pasteText.trim()) return;
    let cleanText = pasteText.trim();
    if (cleanText.startsWith('(') && cleanText.endsWith(')')) cleanText = cleanText.slice(1, -1);

    const newItems = cleanText
      .split(/[\n,;]+/)
      .map(line => line.replace(/^[\s\-\*\•]+/, '').trim())
      .filter(line => line.length > 0)
      .map(text => ({
        id: crypto.randomUUID(),
        text,
        checked: false,
        timestamp: Date.now()
      }));
      
    const updated = [...items, ...newItems];
    setItems(updated);
    setPasteText('');
    updateSharedState({ items: updated });
  };

  const toggleItem = (id) => {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(updated);
    updateSharedState({ items: updated });
  };

  const removeItem = (id) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    updateSharedState({ items: updated });
  };

  const editItem = (id, newText) => {
    const updated = items.map(i => i.id === id ? { ...i, text: newText } : i);
    setItems(updated);
    updateSharedState({ items: updated });
  };

  const clearChecked = () => {
    const updated = items.filter(i => !i.checked);
    setItems(updated);
    updateSharedState({ items: updated });
  };

  // --- Handlers para RacharCard ---
  const handleTotalChange = (val) => {
    setTotalAmount(val);
    updateSharedState({ totalAmount: val });
  };

  const addBuyer = () => {
    const updated = [...buyers, { id: crypto.randomUUID(), name: `Família ${buyers.length + 1}`, heads: 1 }];
    setBuyers(updated);
    updateSharedState({ buyers: updated });
  };

  const removeBuyer = (id) => {
    const updated = buyers.filter(b => b.id !== id);
    setBuyers(updated);
    updateSharedState({ buyers: updated });
  };

  const updateHeads = (id, delta) => {
    const updated = buyers.map(b => b.id === id ? { ...b, heads: Math.max(1, b.heads + delta) } : b);
    setBuyers(updated);
    updateSharedState({ buyers: updated });
  };

  const updateName = (id, newName) => {
    const updated = buyers.map(b => b.id === id ? { ...b, name: newName } : b);
    setBuyers(updated);
    updateSharedState({ buyers: updated });
  };

  const shareList = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Minha Lista de Mercado', url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copiado!");
    }
  };

  // --- Handlers do Histórico ---
  const handleShowHistorico = () => {
    setListHistory(getHistory());
    setShowHistorico(true);
  };

  const handleNewList = () => {
    const newId = crypto.randomUUID().split('-')[0];
    saveLastListId(newId);
    const params = new URLSearchParams(window.location.search);
    params.set('list', newId);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    setItems([]);
    setBuyers(initialBuyers);
    setTotalAmount('');
    setLoading(true);
    setListId(newId);
    setShowHistorico(false);
  };

  const handleOpenList = (id) => {
    if (id === listId) { setShowHistorico(false); return; }
    saveLastListId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('list', id);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    setLoading(true);
    setListId(id);
    setShowHistorico(false);
  };

  const handleRemoveFromHistory = (id) => {
    removeHistoryEntry(id);
    setListHistory(getHistory());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-emerald-600">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-medium text-slate-500">Conectando ao Mercado Fácil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 selection:bg-emerald-500/30">
      {/* Header Premium */}
      <header className="header-premium p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/15 p-2 rounded-xl">
            <ShoppingCart size={22} className="text-emerald-600" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-800">MERCADO FÁCIL <span className="text-emerald-500 font-medium">ACKER</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleShowHistorico} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 rounded-xl transition-all btn-ripple" title="Histórico de listas">
            <History size={20} />
          </button>
          <button onClick={shareList} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 rounded-xl transition-all btn-ripple">
            <Share2 size={20} />
          </button>
          <div className="flex items-center gap-1.5 text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-full border border-slate-200">
            {error ? <WifiOff size={12} className="text-red-500" /> : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            <span className="font-bold tracking-wider uppercase">{error ? 'Erro' : 'Cloud Sync'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 animate-fade-in">
        <ListaCard 
          items={items}
          listId={listId}
          pasteText={pasteText}
          setPasteText={setPasteText}
          onProcessText={handleProcessText}
          onToggleItem={toggleItem}
          onRemoveItem={removeItem}
          onEditItem={editItem}
          onClearChecked={clearChecked}
        />

        {/* Divisor com Glow (Estilo Light/Premium) */}
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Linha principal */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-40"></div>
            {/* Efeito Glow */}
            <div className="absolute w-3/4 h-[2px] bg-emerald-400 blur-[4px] opacity-30"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-50 px-4 py-1.5 text-[10px] font-bold text-emerald-600 tracking-widest uppercase rounded-full border border-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-sm">
              Financeiro
            </span>
          </div>
        </div>

        <RacharCard 
          buyers={buyers}
          totalAmount={totalAmount}
          onTotalChange={handleTotalChange}
          onAddBuyer={addBuyer}
          onRemoveBuyer={removeBuyer}
          onUpdateHeads={updateHeads}
          onUpdateName={updateName}
        />

        <footer className="py-8 text-center">
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase opacity-50">
            Design Premium • PWA Mobile First
          </p>
        </footer>
      </main>

      <HistoricoModal
        show={showHistorico}
        onClose={() => setShowHistorico(false)}
        history={listHistory}
        currentListId={listId}
        onOpenList={handleOpenList}
        onNewList={handleNewList}
        onRemoveFromHistory={handleRemoveFromHistory}
      />
    </div>
  );
}

export default App;
