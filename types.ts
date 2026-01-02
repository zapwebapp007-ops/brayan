
export enum EntityType {
  TABLE = 'TABLE',
  KTV_ROOM = 'KTV_ROOM'
}

export enum EntityStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
  OVERTIME = 'OVERTIME'
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PREPARING = 'PREPARING',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  FLOOR_MANAGER = 'FLOOR_MANAGER',
  CASHIER = 'CASHIER',
  WAITER = 'WAITER'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  status: OrderStatus;
}

export interface Order {
  id: string;
  entityId: string;
  items: OrderItem[];
  createdAt: number;
  status: 'OPEN' | 'CLOSED';
}

export interface KTVRoomSession {
  id: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  gracePeriodMinutes: number;
  hourlyRate: number;
}

export interface FloorEntity {
  id: string;
  name: string;
  type: EntityType;
  status: EntityStatus;
  capacity: number;
  hourlyRate?: number;
  currentSessionId?: string;
  currentOrderId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  details: string;
}

export interface AppState {
  entities: FloorEntity[];
  sessions: KTVRoomSession[];
  orders: Order[];
  products: Product[];
  currentUser: UserRole;
  auditLogs: AuditLog[];
}
