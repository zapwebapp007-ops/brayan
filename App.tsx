
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Layout/Sidebar';
import FloorGrid from './components/Floor/FloorGrid';
import EntityModal from './components/Modals/EntityModal';
import { AppState, UserRole, FloorEntity, EntityStatus, OrderItem, EntityType, Order, KTVRoomSession, OrderStatus, Product, AuditLog } from './types';
import { INITIAL_ENTITIES, INITIAL_PRODUCTS } from './constants';
import { LayoutDashboard, Users, Clock, AlertTriangle, Search, Filter, History, Trash2, PlusCircle, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('resto-ktv-state');
    if (saved) return JSON.parse(saved);
    return {
      entities: INITIAL_ENTITIES,
      sessions: [],
      orders: [],
      products: INITIAL_PRODUCTS,
      currentUser: UserRole.ADMIN,
      auditLogs: []
    };
  });

  const [activeTab, setActiveTab] = useState('floor');
  const [selectedEntity, setSelectedEntity] = useState<FloorEntity | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCat, setNewProductCat] = useState('Food');

  useEffect(() => {
    localStorage.setItem('resto-ktv-state', JSON.stringify(state));
  }, [state]);

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      userId: state.currentUser,
      action,
      details
    };
    setState(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs].slice(0, 100) }));
  };

  const handleRoleChange = (role: UserRole) => {
    setState(prev => ({ ...prev, currentUser: role }));
    addAuditLog('ROLE_CHANGE', `Switched role to ${role}`);
  };

  const updateEntity = (id: string, updates: Partial<FloorEntity>) => {
    setState(prev => ({
      ...prev,
      entities: prev.entities.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const handleUpdateOrder = (entityId: string, items: OrderItem[]) => {
    const entity = state.entities.find(e => e.id === entityId);
    if (!entity) return;

    let newOrderId = entity.currentOrderId;
    let newOrders = [...state.orders];

    if (!newOrderId) {
      newOrderId = Math.random().toString(36).substr(2, 9);
      newOrders.push({
        id: newOrderId,
        entityId: entityId,
        items,
        createdAt: Date.now(),
        status: 'OPEN'
      });
      updateEntity(entityId, { currentOrderId: newOrderId, status: EntityStatus.OCCUPIED });
      addAuditLog('NEW_ORDER', `Created order for ${entity.name}`);
    } else {
      newOrders = newOrders.map(o => o.id === newOrderId ? { ...o, items } : o);
      addAuditLog('ORDER_UPDATE', `Updated items for ${entity.name}`);
    }

    setState(prev => ({ ...prev, orders: newOrders }));
  };

  const handleStartSession = (entityId: string) => {
    const entity = state.entities.find(e => e.id === entityId);
    if (!entity || entity.type !== EntityType.KTV_ROOM) return;

    const sessionId = Math.random().toString(36).substr(2, 9);
    const newSession: KTVRoomSession = {
      id: sessionId,
      roomId: entityId,
      startTime: Date.now(),
      gracePeriodMinutes: 10,
      hourlyRate: entity.hourlyRate || 0
    };

    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession]
    }));
    updateEntity(entityId, { currentSessionId: sessionId, status: EntityStatus.OCCUPIED });
    addAuditLog('START_SESSION', `Started KTV session for ${entity.name}`);
  };

  const handleEndSession = (entityId: string) => {
    updateEntity(entityId, { status: EntityStatus.CLEANING });
    addAuditLog('END_SESSION', `Ended KTV session for room ${entityId}`);
  };

  // Fixed typo: replaced undefined 'newProductProductCat' with correct 'newProductCat'
  const handleProductAdd = () => {
    if (!newProductName || !newProductPrice) return;
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProductName,
      price: parseFloat(newProductPrice),
      category: newProductCat,
      description: 'Newly added menu item'
    };
    setState(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    setNewProductName('');
    setNewProductPrice('');
    addAuditLog('ADD_PRODUCT', `Added ${newProductName} to menu`);
  };

  const handleUpdateItemStatus = (orderId: string, itemId: string, newStatus: OrderStatus) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? {
        ...o,
        items: o.items.map(i => i.id === itemId ? { ...i, status: newStatus } : i)
      } : o)
    }));
  };

  const kitchenTickets = useMemo(() => {
    const pendingItems: any[] = [];
    state.orders.forEach(order => {
      const entity = state.entities.find(e => e.id === order.entityId);
      order.items.forEach(item => {
        if (item.status === OrderStatus.SENT || item.status === OrderStatus.PREPARING) {
          pendingItems.push({ 
            ...item, 
            entityName: entity?.name || 'Unknown', 
            orderId: order.id,
            timeAgo: Math.floor((Date.now() - order.createdAt) / 60000)
          });
        }
      });
    });
    return pendingItems.sort((a, b) => b.timeAgo - a.timeAgo);
  }, [state.orders, state.entities]);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar 
        currentRole={state.currentUser} 
        onRoleChange={handleRoleChange} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <header className="p-8 pb-4 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'floor' && 'Floor Control'}
              {activeTab === 'orders' && 'Kitchen & Bar Display'}
              {activeTab === 'ktv' && 'Private KTV Management'}
              {activeTab === 'admin' && 'System Management'}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
               {activeTab === 'floor' && 'Manage guest seating and real-time status'}
               {activeTab === 'orders' && 'Real-time ticket fulfillment for F&B staff'}
               {activeTab === 'ktv' && 'Oversee room timers and booking schedules'}
               {activeTab === 'admin' && 'Enterprise configurations and audit trails'}
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-sm font-bold text-slate-700">{state.entities.filter(e => e.status === EntityStatus.AVAILABLE).length} Tables Available</span>
             </div>
             <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
               <span className="text-sm font-bold text-slate-700">{state.entities.filter(e => e.status === EntityStatus.OCCUPIED).length} Tables Occupied</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pt-0">
          {activeTab === 'floor' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[75vh] bg-grid-pattern overflow-hidden">
               <FloorGrid 
                  entities={state.entities} 
                  sessions={state.sessions}
                  orders={state.orders}
                  onEntityClick={(e) => setSelectedEntity(e)}
               />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 max-w-5xl mx-auto">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {kitchenTickets.length > 0 ? kitchenTickets.map((ticket, idx) => (
                    <div key={idx} className={`p-6 rounded-3xl border-2 shadow-sm transition-all ${
                       ticket.status === OrderStatus.SENT ? 'bg-white border-indigo-100' : 'bg-amber-50 border-amber-200'
                    }`}>
                       <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{ticket.entityName}</span>
                            <h3 className="font-bold text-lg text-slate-900 mt-1">{ticket.name}</h3>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1">
                             <Clock size={10}/> {ticket.timeAgo}m ago
                          </span>
                       </div>
                       <p className="text-xs text-slate-500 mb-6 font-medium">Quantity: <span className="text-slate-900 font-bold">{ticket.quantity}</span></p>
                       <div className="flex gap-2">
                          {ticket.status === OrderStatus.SENT ? (
                            <button 
                              onClick={() => handleUpdateItemStatus(ticket.orderId, ticket.id, OrderStatus.PREPARING)}
                              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                              Start Preparing
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateItemStatus(ticket.orderId, ticket.id, OrderStatus.SERVED)}
                              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={14}/> Mark Served
                            </button>
                          )}
                       </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                       <LayoutDashboard size={64} className="mx-auto text-slate-200 mb-4" />
                       <h3 className="text-xl font-bold text-slate-400">No active kitchen tickets</h3>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'ktv' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {state.entities.filter(e => e.type === EntityType.KTV_ROOM).map(room => (
                 <div key={room.id} onClick={() => setSelectedEntity(room)} className="bg-white p-6 rounded-3xl border border-slate-200 cursor-pointer hover:border-indigo-600 hover:shadow-xl transition-all shadow-sm group">
                    <div className="flex justify-between items-center mb-6">
                       <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <History size={24}/>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          room.status === EntityStatus.AVAILABLE ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                       }`}>
                         {room.status}
                       </span>
                    </div>
                    <h3 className="font-black text-xl text-slate-900 mb-1">{room.name}</h3>
                    <p className="text-xs text-slate-500 mb-4 font-medium">Capacity: {room.capacity} Pax</p>
                    <div className="space-y-2 border-t pt-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold">Hourly Rate</span>
                          <span className="text-slate-900 font-black">₱{room.hourlyRate}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold">Status</span>
                          <span className="text-indigo-600 font-black">{room.currentSessionId ? 'ACTIVE' : 'READY'}</span>
                       </div>
                    </div>
                 </div>
              ))}
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
               {/* Product Management */}
               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col h-[70vh]">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                     <PlusCircle className="text-indigo-600" /> Menu Management
                  </h2>
                  <div className="space-y-4 mb-6 shrink-0">
                     <div className="grid grid-cols-2 gap-4">
                        <input 
                           type="text" 
                           placeholder="Product Name" 
                           className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                           value={newProductName}
                           onChange={(e) => setNewProductName(e.target.value)}
                        />
                        <input 
                           type="number" 
                           placeholder="Price" 
                           className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                           value={newProductPrice}
                           onChange={(e) => setNewProductPrice(e.target.value)}
                        />
                     </div>
                     <div className="flex gap-4">
                        <select 
                           className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           value={newProductCat}
                           onChange={(e) => setNewProductCat(e.target.value)}
                        >
                           <option>Food</option>
                           <option>Drinks</option>
                           <option>Cocktails</option>
                        </select>
                        <button 
                           onClick={handleProductAdd}
                           className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                        >
                           Add Product
                        </button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                     {state.products.map(p => (
                        <div key={p.id} className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center group">
                           <div>
                              <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{p.category} • ₱{p.price}</p>
                           </div>
                           <button onClick={() => {
                              setState(prev => ({ ...prev, products: prev.products.filter(item => item.id !== p.id) }));
                              addAuditLog('DELETE_PRODUCT', `Removed ${p.name} from menu`);
                           }} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-50 rounded-lg">
                              <Trash2 size={18}/>
                           </button>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Audit Log */}
               <div className="bg-slate-900 rounded-3xl shadow-sm p-8 flex flex-col h-[70vh] text-slate-300">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                     <AlertTriangle className="text-amber-500" /> System Audit Trail
                  </h2>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-mono text-xs">
                     {state.auditLogs.map(log => (
                        <div key={log.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-indigo-400 font-bold">[{log.action}]</span>
                              <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                           </div>
                           <p className="text-slate-400">{log.details}</p>
                           <div className="mt-2 text-[9px] text-slate-600 flex justify-between">
                              <span>User: {log.userId}</span>
                              <span>Log ID: {log.id}</span>
                           </div>
                        </div>
                     ))}
                     {state.auditLogs.length === 0 && <p className="text-center text-slate-600 mt-20">No logs recorded yet.</p>}
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {selectedEntity && (
        <EntityModal 
          entity={selectedEntity}
          products={state.products}
          currentOrder={state.orders.find(o => o.id === selectedEntity.currentOrderId)}
          currentSession={state.sessions.find(s => s.id === selectedEntity.currentSessionId)}
          onClose={() => setSelectedEntity(null)}
          onUpdateEntity={updateEntity}
          onUpdateOrder={handleUpdateOrder}
          onStartSession={handleStartSession}
          onEndSession={handleEndSession}
        />
      )}
    </div>
  );
};

export default App;
