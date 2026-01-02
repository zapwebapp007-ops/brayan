
import React, { useState, useEffect } from 'react';
import { FloorEntity, EntityStatus, EntityType, Product, OrderItem, OrderStatus, Order, KTVRoomSession } from '../../types';
import { X, ShoppingBag, CreditCard, Play, Square, Plus, Minus, Trash2, Sparkles, Loader2, Clock, PlusCircle, CheckCircle2, ReceiptText } from 'lucide-react';
import { getSmartSuggestions } from '../../services/geminiService';
import { VAT_RATE, SERVICE_CHARGE_RATE } from '../../constants';

interface EntityModalProps {
  entity: FloorEntity;
  products: Product[];
  currentOrder?: Order;
  currentSession?: KTVRoomSession;
  onClose: () => void;
  onUpdateEntity: (id: string, updates: Partial<FloorEntity>) => void;
  onUpdateOrder: (entityId: string, items: OrderItem[]) => void;
  onStartSession: (entityId: string) => void;
  onEndSession: (entityId: string) => void;
}

const EntityModal: React.FC<EntityModalProps> = ({ 
  entity, products, currentOrder, currentSession, onClose, 
  onUpdateEntity, onUpdateOrder, onStartSession, onEndSession 
}) => {
  const [activeTab, setActiveTab] = useState<'order' | 'billing' | 'session'>('order');
  const [localItems, setLocalItems] = useState<OrderItem[]>(currentOrder?.items || []);
  const [suggestions, setSuggestions] = useState<{name: string, reason: string}[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'success'>('review');
  const [sessionTime, setSessionTime] = useState<string>('00:00:00');

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  useEffect(() => {
    if (activeTab === 'order') {
      fetchSuggestions();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: number;
    if (currentSession) {
      interval = window.setInterval(() => {
        const diff = Date.now() - currentSession.startTime;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setSessionTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentSession]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    const result = await getSmartSuggestions(localItems, products, entity.type);
    setSuggestions(result);
    setLoadingSuggestions(false);
  };

  const addItem = (product: Product) => {
    const existing = localItems.find(i => i.productId === product.id && i.status === OrderStatus.DRAFT);
    if (existing) {
      setLocalItems(localItems.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setLocalItems([...localItems, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        status: OrderStatus.DRAFT
      }]);
    }
  };

  const removeItem = (id: string) => {
    setLocalItems(localItems.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setLocalItems(localItems.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const sendOrder = () => {
    const updatedItems = localItems.map(i => i.status === OrderStatus.DRAFT ? { ...i, status: OrderStatus.SENT } : i);
    setLocalItems(updatedItems);
    onUpdateOrder(entity.id, updatedItems);
    onUpdateEntity(entity.id, { status: EntityStatus.OCCUPIED });
  };

  const calculateSubtotal = () => localItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const roomCost = () => {
    if (!currentSession) return 0;
    const hours = Math.ceil((Date.now() - currentSession.startTime) / 3600000);
    return hours * currentSession.hourlyRate;
  };
  
  const subtotal = calculateSubtotal() + roomCost();
  const sc = subtotal * SERVICE_CHARGE_RATE;
  const vat = (subtotal + sc) * VAT_RATE;
  const total = subtotal + sc + vat;

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const confirmCheckout = () => {
    setCheckoutStep('success');
    onUpdateEntity(entity.id, { status: EntityStatus.CLEANING, currentOrderId: undefined, currentSessionId: undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{entity.name}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              entity.status === EntityStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>{entity.status}</span>
            {currentSession && <div className="flex items-center gap-1.5 ml-4 text-indigo-600 font-mono font-bold bg-indigo-50 px-3 py-1 rounded-lg">
              <Clock size={16}/> {sessionTime}
            </div>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Navigation */}
          <div className="w-20 border-r bg-slate-50 flex flex-col items-center py-6 gap-6">
            <button onClick={() => { setActiveTab('order'); setCheckoutStep('review'); }} className={`p-4 rounded-2xl transition-all shadow-sm ${activeTab === 'order' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}><Plus size={24}/></button>
            {entity.type === EntityType.KTV_ROOM && (
              <button onClick={() => { setActiveTab('session'); setCheckoutStep('review'); }} className={`p-4 rounded-2xl transition-all shadow-sm ${activeTab === 'session' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}><Clock size={24}/></button>
            )}
            <button onClick={() => { setActiveTab('billing'); setCheckoutStep('review'); }} className={`p-4 rounded-2xl transition-all shadow-sm ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}><CreditCard size={24}/></button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'order' && (
              <>
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles className="text-amber-500" size={20}/> Smart Suggestions</h3>
                       <button onClick={fetchSuggestions} className="text-xs font-bold text-indigo-600 hover:underline">Refresh</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {loadingSuggestions ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-white border animate-pulse rounded-2xl"></div>)
                      ) : suggestions.length > 0 ? suggestions.map((s, idx) => {
                        const product = products.find(p => p.name === s.name);
                        return (
                          <div key={idx} className="p-4 bg-white border border-amber-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">{s.reason}</p>
                            {product && (
                              <button onClick={() => addItem(product)} className="mt-3 w-full py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold hover:bg-amber-600 transition-colors">Add ₱{product.price}</button>
                            )}
                          </div>
                        );
                      }) : <div className="col-span-3 text-center py-6 text-slate-400 text-sm">No suggestions available</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    {categories.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                          selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addItem(p)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col justify-between group shadow-sm">
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                        </div>
                        <p className="mt-4 font-black text-slate-900">₱{p.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-80 border-l bg-white flex flex-col shadow-xl">
                  <div className="p-6 border-b">
                    <h3 className="font-bold flex items-center gap-2 text-lg"><ShoppingBag size={20}/> Current Order</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {localItems.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <ShoppingBag size={48}/>
                        <p className="mt-4 font-medium">Cart is empty</p>
                      </div>
                    )}
                    {localItems.map(item => (
                      <div key={item.id} className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${
                        item.status === OrderStatus.DRAFT ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white'
                      }`}>
                        <div className="flex-1 mr-2">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500">₱{item.price}</span>
                            {item.status !== OrderStatus.DRAFT && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold uppercase tracking-tighter">{item.status}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === OrderStatus.DRAFT ? (
                            <>
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-200 rounded text-slate-400"><Minus size={14}/></button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-200 rounded text-slate-400"><Plus size={14}/></button>
                              <button onClick={() => removeItem(item.id)} className="ml-1 text-rose-500 hover:text-rose-700"><Trash2 size={16}/></button>
                            </>
                          ) : (
                            <span className="font-bold text-slate-400 text-sm">x{item.quantity}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-slate-50 border-t space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-500 text-sm font-medium">Total Items</span>
                      <span className="text-xl font-black text-slate-900">₱{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <button 
                      disabled={!localItems.some(i => i.status === OrderStatus.DRAFT)}
                      onClick={sendOrder}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={20}/> Send to Kitchen
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'session' && (
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center bg-gray-50/30">
                <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 ${
                  currentSession ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Music className={currentSession ? 'animate-bounce' : ''} size={80}/>
                </div>
                {currentSession ? (
                  <div className="space-y-8 max-w-sm">
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">VIP Session Active</h3>
                      <p className="text-slate-500 mt-2 font-medium">Started at {new Date(currentSession.startTime).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-6xl font-mono font-black text-indigo-600 bg-white py-10 px-6 rounded-3xl shadow-sm border border-indigo-100">
                       {sessionTime}
                    </div>
                    <button 
                      onClick={() => onEndSession(entity.id)}
                      className="w-full py-5 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-3"
                    >
                      <Square size={24} fill="currentColor"/> Stop & Start Cleaning
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 max-w-sm">
                     <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">KTV Room Ready</h3>
                      <p className="text-slate-500 mt-2 font-medium">Rates apply from the moment the timer starts.</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                       <div className="flex justify-between font-bold">
                          <span className="text-slate-500">Hourly Rate</span>
                          <span className="text-slate-900">₱{entity.hourlyRate} / hr</span>
                       </div>
                       <div className="flex justify-between font-bold">
                          <span className="text-slate-500">Grace Period</span>
                          <span className="text-slate-900">10 Minutes</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => onStartSession(entity.id)}
                      className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-3"
                    >
                      <Play size={24} fill="currentColor"/> Begin Session
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="flex-1 flex bg-gray-50/30 overflow-hidden">
                {checkoutStep === 'review' ? (
                  <div className="flex-1 p-12 overflow-y-auto">
                    <div className="max-w-2xl mx-auto space-y-8">
                      <div className="border-b-2 border-slate-200 pb-6 flex justify-between items-end">
                        <div>
                          <h3 className="text-4xl font-black text-slate-900 tracking-tight">Bill Summary</h3>
                          <p className="text-slate-500 mt-1 font-medium">Table: {entity.name} • {new Date().toLocaleDateString()}</p>
                        </div>
                        <ReceiptText size={40} className="text-slate-300" />
                      </div>

                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                        <div className="space-y-4 max-h-64 overflow-y-auto pr-4">
                           {localItems.map(item => (
                             <div key={item.id} className="flex justify-between items-center text-slate-700">
                               <span className="flex items-center gap-2">
                                 <span className="font-bold text-indigo-600">x{item.quantity}</span>
                                 {item.name}
                               </span>
                               <span className="font-medium font-mono">₱{(item.price * item.quantity).toLocaleString()}</span>
                             </div>
                           ))}
                           {currentSession && (
                             <div className="flex justify-between items-center text-indigo-600 font-bold border-t pt-4 border-dashed">
                               <span>KTV Room Rental ({Math.ceil((Date.now() - currentSession.startTime) / 3600000)} hr)</span>
                               <span className="font-mono">₱{roomCost().toLocaleString()}</span>
                             </div>
                           )}
                        </div>

                        <div className="border-t-2 pt-6 space-y-3">
                          <div className="flex justify-between text-slate-500 font-medium">
                            <span>Subtotal</span>
                            <span className="font-mono">₱{subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 font-medium">
                            <span>Service Charge (10%)</span>
                            <span className="font-mono">₱{sc.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 font-medium pb-2">
                            <span>VAT (12%)</span>
                            <span className="font-mono">₱{vat.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-4xl font-black text-slate-900 border-t pt-4">
                            <span>Total</span>
                            <span className="text-indigo-600 font-mono">₱{total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button className="py-5 border-2 border-slate-200 bg-white rounded-2xl font-bold text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center gap-1">
                          <span className="text-xl">💵 Cash</span>
                        </button>
                        <button className="py-5 border-2 border-slate-200 bg-white rounded-2xl font-bold text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center gap-1">
                          <span className="text-xl">💳 Card / E-Pay</span>
                        </button>
                      </div>
                      
                      <button 
                        onClick={confirmCheckout}
                        className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                      >
                        Complete & Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={64}/>
                    </div>
                    <h3 className="text-4xl font-black text-slate-900">Payment Successful</h3>
                    <p className="text-slate-500 mt-4 max-w-xs text-lg font-medium">Table has been cleared. Receipt has been printed and sent to server.</p>
                    <div className="mt-10 flex gap-4">
                       <button onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200">Return to Floor</button>
                       <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">Print Receipt</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { Music } from 'lucide-react';
export default EntityModal;
