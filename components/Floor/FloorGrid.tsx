
import React, { useState, useEffect } from 'react';
import { EntityType, EntityStatus, FloorEntity, KTVRoomSession, Order } from '../../types';
import { Clock, Users, Timer, PlusCircle, CreditCard } from 'lucide-react';

interface FloorGridProps {
  entities: FloorEntity[];
  sessions: KTVRoomSession[];
  orders: Order[];
  onEntityClick: (entity: FloorEntity) => void;
}

const FloorGrid: React.FC<FloorGridProps> = ({ entities, sessions, orders, onEntityClick }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: EntityStatus) => {
    switch (status) {
      case EntityStatus.AVAILABLE: return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case EntityStatus.OCCUPIED: return 'bg-blue-50 border-blue-200 text-blue-700';
      case EntityStatus.CLEANING: return 'bg-amber-50 border-amber-200 text-amber-700';
      case EntityStatus.RESERVED: return 'bg-purple-50 border-purple-200 text-purple-700';
      case EntityStatus.OVERTIME: return 'bg-rose-50 border-rose-200 text-rose-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  }

  const formatDuration = (start: number) => {
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {entities.map(entity => {
        const session = sessions.find(s => s.id === entity.currentSessionId);
        const order = orders.find(o => o.id === entity.currentOrderId);
        const statusStyle = getStatusColor(entity.status);

        return (
          <div 
            key={entity.id}
            onClick={() => onEntityClick(entity)}
            className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg active:scale-95 group ${statusStyle}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${entity.type === EntityType.KTV_ROOM ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                  {entity.type === EntityType.KTV_ROOM ? <Clock size={20} /> : <Users size={20} />}
                </span>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{entity.name}</h3>
                  <p className="text-xs opacity-80 uppercase tracking-widest font-semibold">{entity.type}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/50 border border-current">
                  {entity.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 opacity-70"><Users size={14}/> Capacity</span>
                <span className="font-semibold">{entity.capacity} Pax</span>
              </div>

              {entity.type === EntityType.KTV_ROOM && session && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 opacity-70"><Timer size={14}/> Duration</span>
                  <span className="font-mono font-bold">{formatDuration(session.startTime)}</span>
                </div>
              )}

              {order && order.items.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 opacity-70"><PlusCircle size={14}/> Items Ordered</span>
                  <span className="font-semibold">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                </div>
              )}
            </div>

            {entity.status === EntityStatus.OCCUPIED && (
               <div className="absolute top-2 right-2 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FloorGrid;
