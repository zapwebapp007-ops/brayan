
import React, { useState, useEffect } from 'react';
import { FloorEntity, EntityStatus, EntityType, Product, OrderItem, OrderStatus, Order, KTVRoomSession, RoomFeatures } from '../../types';
import { X, ShoppingBag, CreditCard, Play, Square, Plus, Minus, Trash2, Sparkles, Loader2, Clock, PlusCircle, CheckCircle2, ReceiptText, Volume2, Settings2, SlidersHorizontal, Music } from 'lucide-react';
import { getSmartSuggestions, speakAnnouncement } from '../../services/geminiService';
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
  const [activeTab, setActiveTab] = useState<'order' | 'billing' | 'session' | 'features'>('order');
  const [localItems, setLocalItems] = useState<OrderItem[]>(currentOrder?.items || []);
  const [suggestions, setSuggestions] = useState<{name: string, reason: string}[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'success'>('review');
  const [sessionTime, setSessionTime] = useState<string>('00:00:00');
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  const handleSpeak = async () => {
    setIsSpeaking(true);
    let message = `${entity.name} is currently ${entity.status}.`;
    if (currentSession) {
      message += ` The session has been active for ${Math.floor((Date.now() - currentSession.startTime) / 3600000)} hours.`;
    }
    if (localItems.length > 0) {
      message += ` Total items ordered: ${localItems.reduce((acc, i) => acc + i.quantity, 0)}.`;
    }
    await speakAnnouncement(message);
    setIsSpeaking(false);
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

  const updateFeature = (key: keyof RoomFeatures, value: string) => {
    const currentFeatures = entity.features || { karaokeMachine: 'Standard', soundSystem: 'Stereo', lighting: 'Standard' };
    onUpdateEntity(entity.id, { features: { ...currentFeatures, [key]: value } });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center lg:p-4 overflow-hidden">
      <div className="bg-white w-full h-full lg:max-w-6xl lg:h-[90vh] lg:rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all relative">
        <div className="p-4 lg:p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 lg:gap-3">
            <h2 className="text-lg lg:text-2xl font-black truncate max-w-[120px] sm:max-w-none">{entity.name}</h2>
            <span className={`px-2 py-0.5 lg:px-3 lg:py-1 rounded-full text-[9px] lg:text-xs font-black uppercase ${
              entity.status === EntityStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>{entity.status}</span>
            {currentSession && <div className="flex items-center gap-1.5 ml-2 text-indigo-600 font-mono font-black bg-indigo-50 px-2 py-0.5 rounded-lg text-xs lg:text-sm">
              <Clock size={14}/> {sessionTime}
            </div>}
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            <button 
              onClick={handleSpeak} 
              disabled={isSpeaking}
              className={`p-1.5 lg:p-2 rounded-full transition-colors flex items-center gap-1 lg:gap-2 px-3 lg:px-4 font-black text-[10px] lg:text-sm ${isSpeaking ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
              <Volume2 size={16} lg:size={20} className={isSpeaking ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{isSpeaking ? 'Speaking...' : 'Status Report'}</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} lg:size={24}/></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Internal Navigation: Horizontal on Mobile, Vertical on Desktop */}
          <div className="flex lg:flex-col w-full lg:w-20 border-b lg:border-r bg-slate-50 p-2 lg:py-6 gap-2 lg:gap-6 justify-around lg:justify-start shrink-0">
            <button onClick={() => { setActiveTab('order'); setCheckoutStep('review'); }} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all shadow-sm flex flex-col items-center gap-1 lg:gap-0 ${activeTab === 'order' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}>
              <Plus size={20} lg:size={24}/>
              <span className="text-[8px] lg:hidden font-black">ORDER</span>
            </button>
            {entity.type === EntityType.KTV_ROOM && (
              <>
                <button onClick={() => { setActiveTab('session'); setCheckoutStep('review'); }} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all shadow-sm flex flex-col items-center gap-1 lg:gap-0 ${activeTab === 'session' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}>
                  <Clock size={20} lg:size={24}/>
                  <span className="text-[8px] lg:hidden font-black">TIME</span>
                </button>
                <button onClick={() => { setActiveTab('features'); setCheckoutStep('review'); }} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all shadow-sm flex flex-col items-center gap-1 lg:gap-0 ${activeTab === 'features' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}>
                  <SlidersHorizontal size={20} lg:size={24}/>
                  <span className="text-[8px] lg:hidden font-black">SETUP</span>
                </button>
              </>
            )}
            <button onClick={() => { setActiveTab('billing'); setCheckoutStep('review'); }} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all shadow-sm flex flex-col items-center gap-1 lg:gap-0 ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 bg-white'}`}>
              <CreditCard size={20} lg:size={24}/>
              <span className="text-[8px] lg:hidden font-black">BILL</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {activeTab === 'order' && (
              <>
                <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-gray-50/50">
                  {/* Suggestions Carousel for Mobile */}
                  <div className="mb-6 lg:mb-8">
                    <div className="flex justify-between items-center mb-3 lg:mb-4 px-1">
                       <h3 className="text-sm lg:text-lg font-black flex items-center gap-2 uppercase tracking-tight"><Sparkles className="text-amber-500" size={16} lg:size={20}/> AI Upsell</h3>
                       <button onClick={fetchSuggestions} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">Refresh</button>
                    </div>
                    <div className="flex lg:grid lg:grid-cols-3 gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                      {loadingSuggestions ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="min-w-[140px] h-24 lg:h-28 bg-white border animate-pulse rounded-xl lg:rounded-2xl shrink-0"></div>)
                      ) : suggestions.length > 0 ? suggestions.map((s, idx) => {
                        const product = products.find(p => p.name === s.name);
                        return (
                          <div key={idx} className="min-w-[140px] lg:min-w-0 p-3 lg:p-4 bg-white border border-amber-200 rounded-xl lg:rounded-2xl shadow-sm hover:shadow-md transition-shadow shrink-0">
                            <h4 className="font-bold text-slate-800 text-[10px] lg:text-sm truncate">{s.name}</h4>
                            <p className="text-[8px] lg:text-[10px] text-slate-500 mt-0.5 lg:mt-1 line-clamp-1 lg:line-clamp-2 leading-tight">{s.reason}</p>
                            {product && (
                              <button onClick={() => addItem(product)} className="mt-2 lg:mt-3 w-full py-1.5 lg:py-2 bg-amber-500 text-white rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black hover:bg-amber-600 transition-colors uppercase">Add ₱{product.price}</button>
                            )}
                          </div>
                        );
                      }) : <div className="w-full text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest">No suggestions</div>}
                    </div>
                  </div>

                  {/* Product Category Tabs */}
                  <div className="flex items-center gap-2 mb-4 lg:mb-6 overflow-x-auto pb-2 -mx-1 px-1">
                    {categories.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 lg:px-4 lg:py-2 rounded-xl lg:rounded-full text-[10px] lg:text-sm font-black whitespace-nowrap transition-all uppercase tracking-tight ${
                          selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-4">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addItem(p)} className="p-3 lg:p-4 bg-white border border-slate-200 rounded-xl lg:rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col justify-between group shadow-sm min-h-[90px] lg:min-h-[120px]">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] lg:text-base group-hover:text-indigo-600 transition-colors line-clamp-1">{p.name}</p>
                          <p className="text-[9px] lg:text-xs text-slate-500 mt-0.5 lg:mt-1 line-clamp-2 leading-tight hidden sm:block">{p.description}</p>
                        </div>
                        <p className="mt-2 lg:mt-4 font-black text-slate-900 text-[12px] lg:text-lg">₱{p.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Cart View: Expandable or Split */}
                <div className="h-48 lg:h-auto lg:w-80 border-t lg:border-t-0 lg:border-l bg-white flex flex-col shadow-2xl z-10">
                  <div className="p-3 lg:p-6 border-b flex justify-between items-center bg-slate-50 lg:bg-white">
                    <h3 className="font-black flex items-center gap-2 text-xs lg:text-lg uppercase tracking-tight"><ShoppingBag size={14} lg:size={20}/> Cart ({localItems.length})</h3>
                    <button className="lg:hidden text-[10px] font-black text-indigo-600" onClick={() => setActiveTab('billing')}>Review Bill</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2">
                    {localItems.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <ShoppingBag size={32} lg:size={48}/>
                        <p className="mt-2 text-[10px] lg:text-sm font-black uppercase">Empty</p>
                      </div>
                    )}
                    {localItems.map(item => (
                      <div key={item.id} className={`p-2 lg:p-4 rounded-xl lg:rounded-2xl border flex justify-between items-center transition-all ${
                        item.status === OrderStatus.DRAFT ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white'
                      }`}>
                        <div className="flex-1 mr-2 overflow-hidden">
                          <p className="text-[10px] lg:text-sm font-bold text-slate-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] lg:text-[10px] text-slate-500">₱{item.price}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 lg:gap-2">
                          {item.status === OrderStatus.DRAFT ? (
                            <>
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 lg:p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"><Minus size={12} lg:size={14}/></button>
                              <span className="text-[11px] lg:text-sm font-black w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 lg:p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"><Plus size={12} lg:size={14}/></button>
                              <button onClick={() => removeItem(item.id)} className="ml-1 text-rose-500 hover:text-rose-700 p-1"><Trash2 size={14} lg:size={16}/></button>
                            </>
                          ) : (
                            <span className="font-black text-slate-400 text-[10px] lg:text-sm uppercase bg-slate-100 px-1.5 py-0.5 rounded-lg">x{item.quantity}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 lg:p-6 bg-slate-50 border-t space-y-2 lg:space-y-4 shrink-0">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-500 text-[10px] lg:text-sm font-black uppercase tracking-widest">Subtotal</span>
                      <span className="text-lg lg:text-xl font-black text-slate-900">₱{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <button 
                      disabled={!localItems.some(i => i.status === OrderStatus.DRAFT)}
                      onClick={sendOrder}
                      className="w-full py-3 lg:py-4 bg-indigo-600 text-white rounded-xl lg:rounded-2xl font-black text-xs lg:text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16}/> Send Order
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'session' && (
              <div className="flex-1 p-6 lg:p-12 flex flex-col items-center justify-center text-center bg-gray-50/30">
                <div className={`w-32 h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center mb-6 lg:mb-8 shadow-2xl transition-all duration-500 ${
                  currentSession ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Music className={currentSession ? 'animate-bounce' : ''} size={48} lg:size={80}/>
                </div>
                {currentSession ? (
                  <div className="space-y-6 lg:space-y-8 max-w-sm w-full">
                    <div>
                      <h3 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase">VIP Active</h3>
                      <p className="text-slate-500 mt-1 lg:mt-2 text-xs lg:text-sm font-bold uppercase tracking-widest">Since {new Date(currentSession.startTime).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-4xl lg:text-6xl font-mono font-black text-indigo-600 bg-white py-6 lg:py-10 px-4 lg:px-6 rounded-2xl lg:rounded-3xl shadow-sm border border-indigo-100">
                       {sessionTime}
                    </div>
                    <button 
                      onClick={() => onEndSession(entity.id)}
                      className="w-full py-4 lg:py-5 bg-rose-500 text-white rounded-xl lg:rounded-2xl font-black text-sm lg:text-base uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-3"
                    >
                      <Square size={20} lg:size={24} fill="currentColor"/> Stop Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 lg:space-y-8 max-w-sm w-full">
                     <div>
                      <h3 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase">Room Ready</h3>
                      <p className="text-slate-500 mt-1 lg:mt-2 text-[10px] lg:text-sm font-black uppercase tracking-tighter">Hourly billing starts immediately</p>
                    </div>
                    <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm space-y-3 lg:space-y-4">
                       <div className="flex justify-between font-black text-[10px] lg:text-sm uppercase">
                          <span className="text-slate-500">Hourly Rate</span>
                          <span className="text-slate-900">₱{entity.hourlyRate}</span>
                       </div>
                       <div className="flex justify-between font-black text-[10px] lg:text-sm uppercase">
                          <span className="text-slate-500">Grace Period</span>
                          <span className="text-slate-900">10m</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => onStartSession(entity.id)}
                      className="w-full py-4 lg:py-5 bg-emerald-500 text-white rounded-xl lg:rounded-2xl font-black text-sm lg:text-base uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-3"
                    >
                      <Play size={20} lg:size={24} fill="currentColor"/> Start Timer
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="flex-1 p-4 lg:p-12 overflow-y-auto bg-gray-50/30 pb-20 lg:pb-12">
                <div className="max-w-2xl mx-auto space-y-6 lg:space-y-8">
                  <div className="border-b pb-4 flex items-center gap-3">
                    <Settings2 className="text-indigo-600" size={24} lg:size={32} />
                    <div>
                      <h3 className="text-xl lg:text-3xl font-black text-slate-900 uppercase">Hardware</h3>
                      <p className="text-[10px] lg:text-sm text-slate-500 font-black uppercase tracking-widest">VIP Equipment Setup</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:gap-6">
                    <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm space-y-3 lg:space-y-4">
                      <label className="block text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Karaoke System</label>
                      <div className="grid grid-cols-3 gap-2 lg:gap-3">
                        {['Standard', 'Premium', 'Platinum'].map((v) => (
                          <button 
                            key={v}
                            onClick={() => updateFeature('karaokeMachine', v as any)}
                            className={`py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[9px] lg:text-xs uppercase border-2 transition-all ${entity.features?.karaokeMachine === v ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm space-y-3 lg:space-y-4">
                      <label className="block text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Sound Engineering</label>
                      <div className="grid grid-cols-3 gap-2 lg:gap-3">
                        {['Stereo', 'Surround 5.1', 'Hi-Fi Pro'].map((v) => (
                          <button 
                            key={v}
                            onClick={() => updateFeature('soundSystem', v as any)}
                            className={`py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[9px] lg:text-xs uppercase border-2 transition-all ${entity.features?.soundSystem === v ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm space-y-3 lg:space-y-4">
                      <label className="block text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Ambiance Lighting</label>
                      <div className="grid grid-cols-2 gap-2 lg:gap-3">
                        {['Standard', 'Disco', 'Mood', 'Custom RGB'].map((v) => (
                          <button 
                            key={v}
                            onClick={() => updateFeature('lighting', v as any)}
                            className={`py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[9px] lg:text-xs uppercase border-2 transition-all ${entity.features?.lighting === v ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="flex-1 flex bg-gray-50/30 overflow-hidden">
                {checkoutStep === 'review' ? (
                  <div className="flex-1 p-4 lg:p-12 overflow-y-auto pb-20 lg:pb-12">
                    <div className="max-w-2xl mx-auto space-y-6 lg:space-y-8">
                      <div className="border-b-2 border-slate-200 pb-4 lg:pb-6 flex justify-between items-end">
                        <div>
                          <h3 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase">Checkout</h3>
                          <p className="text-[10px] lg:text-sm text-slate-500 mt-1 font-black uppercase tracking-widest">{entity.name} • {new Date().toLocaleDateString()}</p>
                        </div>
                        <ReceiptText size={28} lg:size={40} className="text-slate-300" />
                      </div>

                      <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 space-y-4 lg:space-y-6">
                        <div className="space-y-3 lg:space-y-4 max-h-48 lg:max-h-64 overflow-y-auto pr-2">
                           {localItems.map(item => (
                             <div key={item.id} className="flex justify-between items-center text-slate-700">
                               <span className="flex items-center gap-2 text-[11px] lg:text-sm">
                                 <span className="font-black text-indigo-600">x{item.quantity}</span>
                                 <span className="font-bold">{item.name}</span>
                               </span>
                               <span className="font-black font-mono text-[11px] lg:text-sm">₱{(item.price * item.quantity).toLocaleString()}</span>
                             </div>
                           ))}
                           {currentSession && (
                             <div className="flex justify-between items-center text-indigo-600 font-black border-t pt-3 lg:pt-4 border-dashed text-[11px] lg:text-sm uppercase tracking-tight">
                               <span>KTV Rental ({Math.ceil((Date.now() - currentSession.startTime) / 3600000)}h)</span>
                               <span className="font-mono">₱{roomCost().toLocaleString()}</span>
                             </div>
                           )}
                        </div>

                        <div className="border-t-2 pt-4 lg:pt-6 space-y-2 lg:space-y-3">
                          <div className="flex justify-between text-slate-500 font-black text-[10px] lg:text-sm uppercase tracking-tighter">
                            <span>Subtotal</span>
                            <span className="font-mono">₱{subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 font-black text-[10px] lg:text-sm uppercase tracking-tighter">
                            <span>SC (10%)</span>
                            <span className="font-mono">₱{sc.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 font-black text-[10px] lg:text-sm uppercase tracking-tighter pb-1 lg:pb-2">
                            <span>VAT (12%)</span>
                            <span className="font-mono">₱{vat.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-2xl lg:text-4xl font-black text-slate-900 border-t pt-3 lg:pt-4">
                            <span className="uppercase tracking-tighter">Total</span>
                            <span className="text-indigo-600 font-mono">₱{total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <button className="py-4 lg:py-5 border-2 border-slate-200 bg-white rounded-xl lg:rounded-2xl font-black text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center gap-1 uppercase text-[10px] lg:text-xs">
                          <span className="text-lg lg:text-xl">💵</span>
                          Cash
                        </button>
                        <button className="py-4 lg:py-5 border-2 border-slate-200 bg-white rounded-xl lg:rounded-2xl font-black text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center gap-1 uppercase text-[10px] lg:text-xs">
                          <span className="text-lg lg:text-xl">💳</span>
                          E-Pay
                        </button>
                      </div>
                      
                      <button 
                        onClick={confirmCheckout}
                        className="w-full py-4 lg:py-6 bg-slate-900 text-white rounded-xl lg:rounded-2xl font-black text-sm lg:text-xl uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                      >
                        Finalize Payment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 lg:mb-6">
                      <CheckCircle2 size={48} lg:size={64}/>
                    </div>
                    <h3 className="text-2xl lg:text-4xl font-black text-slate-900 uppercase">Paid & Cleared</h3>
                    <p className="text-slate-500 mt-2 lg:mt-4 max-w-xs text-xs lg:text-lg font-black uppercase tracking-widest leading-tight">Entity updated to cleaning status.</p>
                    <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 lg:gap-4 w-full sm:w-auto px-6 sm:px-0">
                       <button onClick={onClose} className="px-8 py-3 lg:py-4 bg-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black text-xs uppercase hover:bg-slate-200">Return to Floor</button>
                       <button className="px-8 py-3 lg:py-4 bg-indigo-600 text-white rounded-xl lg:rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100">Print Receipt</button>
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

export default EntityModal;
