import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QueueItem } from '../types';
import { GripVertical, Clock, User, Scissors } from 'lucide-react';
import { QueueService } from '../services/QueueService';
import { AppConfig } from '../types';

interface SortableItemProps {
  item: QueueItem;
  ewt?: number;
  isDragging?: boolean;
  onStatusChange: (id: string, status: 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'AUSENTE') => void;
  onRemove: (id: string) => void;
}

function SortableQueueItem({ item, ewt, isDragging, onStatusChange, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const statusColors = {
    AGUARDANDO: 'bg-yellow-50 border-yellow-200',
    EM_ATENDIMENTO: 'bg-green-50 border-green-200',
    CONCLUIDO: 'bg-gray-50 border-gray-200',
    CANCELADO: 'bg-red-50 border-red-200',
    AUSENTE: 'bg-orange-50 border-orange-200',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 mb-2 rounded-lg border transition-all ${
        isDragging ? 'bg-blue-50 border-blue-400 shadow-lg scale-105' : statusColors[item.status]
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical size={20} />
      </button>

      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold">
        {item.posicao}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <User size={14} className="text-gray-400" />
          <span className="font-medium truncate">{item.clienteNome}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Scissors size={14} />
          <span className="truncate">{item.servicos}</span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-sm">
          <Clock size={14} className="text-gray-400" />
          <span>{item.horaPrevista}</span>
        </div>
        {ewt !== undefined && ewt > 0 && (
          <div className="text-xs text-gray-500">~{ewt}min</div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {item.status === 'AGUARDANDO' && (
          <button
            onClick={() => onStatusChange(item.id, 'EM_ATENDIMENTO')}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Iniciar
          </button>
        )}
        {item.status === 'EM_ATENDIMENTO' && (
          <button
            onClick={() => onStatusChange(item.id, 'CONCLUIDO')}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Finalizar
          </button>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

interface QueueDragListProps {
  items: QueueItem[];
  config: AppConfig;
  ewtByTicket?: Map<string, number>;
  onReorder: (ticketId: string, newPosition: number) => void;
}

export function QueueDragList({ items, config, ewtByTicket, onReorder }: QueueDragListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(items);

  useState(() => {
    setLocalItems(items);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex(item => item.id === active.id);
    const newIndex = localItems.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(newItems);

      const newPosition = newIndex + 1;
      await onReorder(active.id as string, newPosition);
      await QueueService.recalculateQueue(config);
    }
  }, [localItems, onReorder, config]);

  const handleStatusChange = useCallback(async (
    id: string,
    status: 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'AUSENTE'
  ) => {
    await QueueService.updateStatus(id, status);
    await QueueService.recalculateQueue(config);
  }, [config]);

  const handleRemove = useCallback(async (id: string) => {
    await QueueService.updateStatus(id, 'CANCELADO');
    await QueueService.recalculateQueue(config);
  }, [config]);

  const activeItem = activeId ? localItems.find(item => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localItems.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {localItems.map((item) => (
          <SortableQueueItem
            key={item.id}
            item={item}
            ewt={ewtByTicket?.get(item.id)}
            isDragging={item.id === activeId}
            onStatusChange={handleStatusChange}
            onRemove={handleRemove}
          />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="bg-blue-50 border-2 border-blue-400 rounded-lg shadow-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-200 font-bold">
                {activeItem.posicao}
              </div>
              <span className="font-medium">{activeItem.clienteNome}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}