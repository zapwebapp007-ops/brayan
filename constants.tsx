
import { Product, EntityType, EntityStatus, FloorEntity } from './types';

export const VAT_RATE = 0.12;
export const SERVICE_CHARGE_RATE = 0.10;

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Crispy Pata', price: 850, category: 'Food', description: 'Deep fried pork knuckle' },
  { id: 'p2', name: 'Sisig Classic', price: 320, category: 'Food', description: 'Sizzling pork cheeks' },
  { id: 'p3', name: 'San Miguel Pale Pilsen', price: 120, category: 'Drinks', description: 'Local beer' },
  { id: 'p4', name: 'Johnny Walker Black', price: 2800, category: 'Drinks', description: '750ml bottle' },
  { id: 'p5', name: 'Gambas Al Ajillo', price: 450, category: 'Food', description: 'Shrimp in garlic oil' },
  { id: 'p6', name: 'Soda (Coke/Sprite)', price: 75, category: 'Drinks', description: '330ml can' },
  { id: 'p7', name: 'Tequila Sunrise', price: 250, category: 'Cocktails', description: 'Refreshing cocktail' },
  { id: 'p8', name: 'Nachos Supreme', price: 380, category: 'Food', description: 'Cheesy nachos' },
];

export const INITIAL_ENTITIES: FloorEntity[] = [
  { id: 't1', name: 'Table 1', type: EntityType.TABLE, status: EntityStatus.AVAILABLE, capacity: 4 },
  { id: 't2', name: 'Table 2', type: EntityType.TABLE, status: EntityStatus.AVAILABLE, capacity: 4 },
  { id: 't3', name: 'Table 3', type: EntityType.TABLE, status: EntityStatus.AVAILABLE, capacity: 2 },
  { id: 't4', name: 'Table 4', type: EntityType.TABLE, status: EntityStatus.AVAILABLE, capacity: 6 },
  { 
    id: 'r1', name: 'VIP Room 1', type: EntityType.KTV_ROOM, status: EntityStatus.AVAILABLE, capacity: 10, hourlyRate: 1500,
    features: { karaokeMachine: 'Platinum', soundSystem: 'Hi-Fi Pro', lighting: 'Custom RGB' }
  },
  { 
    id: 'r2', name: 'VIP Room 2', type: EntityType.KTV_ROOM, status: EntityStatus.AVAILABLE, capacity: 15, hourlyRate: 2000,
    features: { karaokeMachine: 'Platinum', soundSystem: 'Surround 5.1', lighting: 'Disco' }
  },
  { 
    id: 'r3', name: 'Deluxe Room A', type: EntityType.KTV_ROOM, status: EntityStatus.AVAILABLE, capacity: 8, hourlyRate: 1000,
    features: { karaokeMachine: 'Premium', soundSystem: 'Surround 5.1', lighting: 'Mood' }
  },
  { 
    id: 'r4', name: 'Deluxe Room B', type: EntityType.KTV_ROOM, status: EntityStatus.AVAILABLE, capacity: 8, hourlyRate: 1000,
    features: { karaokeMachine: 'Premium', soundSystem: 'Stereo', lighting: 'Standard' }
  },
];
