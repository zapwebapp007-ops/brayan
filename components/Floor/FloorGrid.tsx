
import React, { useState, useEffect } from 'react';
import { EntityType, EntityStatus, FloorEntity, KTVRoomSession, Order } from '../../types';
import { Clock, Users, Timer, PlusCircle } from 'lucide-react';

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
      case EntityStatus.AVAILABLE: return 'bg-emerald-50 border-emerald-100 lg:border-emerald-200 text-emerald-700';
      case EntityStatus.OCCUPIED: return 'bg-blue-50 border-blue-100 lg:border-blue-200 text-blue-700';
      case EntityStatus.CLEANING: return 'bg-amber-50 border-amber-100 lg:border-amber-200 text-amber-700';
      case EntityStatus.RESERVED: return 'bg-purple-50 border-purple-100 lg:border-purple-200 text-purple-700';
      case EntityStatus.OVERTIME: return 'bg-rose-50 border-rose-100 lg:border-rose-200 text-rose-700';
      default: return 'bg-gray-50 border-gray-100 lg:border-gray-200 text-gray-700';
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
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6 p-3 lg:p-6">
      {entities.map(entity => {
        const session = sessions.find(s => s.id === entity.currentSessionId);
        const order = orders.find(o => o.id === entity.currentOrderId);
        const statusStyle = getStatusColor(entity.status);

        return (
          <div 
            key={entity.id}
            onClick={() => onEntityClick(entity)}
            className={`relative p-3 lg:p-6 rounded-xl lg:rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg active:scale-95 group ${statusStyle} flex flex-col justify-between h-32 lg:h-auto`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <span className={`p-1.5 lg:p-2 rounded-lg lg:rounded-xl ${entity.type === EntityType.KTV_ROOM ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                  {entity.type === EntityType.KTV_ROOM ? <Clock size={16} lg:size={20} /> : <Users size={16} lg:size={20} />}
                </span>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm lg:text-lg leading-tight truncate">{entity.name}</h3>
                  <p className="text-[8px] lg:text-xs opacity-80 uppercase tracking-widest font-black lg:font-semibold hidden sm:block">{entity.type}</p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[8px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full bg-white/50 border border-current whitespace-nowrap">
                  {entity.status}
                </span>
              </div>
            </div>

            <div className="space-y-1 lg:space-y-3 mt-2">
              <div className="flex items-center justify-between text-[10px] lg:text-sm">
                <span className="flex items-center gap-1 opacity-70"><Users size={10} lg:size={14}/> {entity.capacity}</span>
                {entity.type === EntityType.KTV_ROOM && session ? (
                   <span className="font-mono font-black lg:font-bold">{formatDuration(session.startTime)}</span>
                ) : (
                  order && order.items.length > 0 && (
                    <span className="font-semibold flex items-center gap-1"><PlusCircle size={10}/>{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                  )
                )}
              </div>
            </div>

            {entity.status === EntityStatus.OCCUPIED && (
               <div className="absolute top-1 right-1 lg:top-2 lg:right-2 flex items-center gap-1">
                  <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-blue-500 animate-pulse"></div>
               </div>
            )}
            
            {/* Visual indicator for Mobile status */}
            <div className="lg:hidden mt-1.5">
               <div className={`h-1 w-full rounded-full bg-current opacity-20`}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FloorGrid;
