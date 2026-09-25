import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanOverlay,
} from '@/components/reui/kanban'

interface CardData {
  id: string
  imageUrl: string
  name: string
}

type Columns = Record<string, CardData[]>

const TIER_ROWS = [
  { id: 'SS', label: 'SS', color: 'bg-red-500/30 text-red-200 font-black border-red-500/40' },
  { id: 'S', label: 'S', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'A', label: 'A', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'B', label: 'B', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'C', label: 'C', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
]

const STORAGE_ID = 'STORAGE'

function CardView({
  card,
  onNameChange,
}: {
  card: CardData
  onNameChange: (id: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition,
    opacity: isDragging ? 0.3 : 1, 
  } : undefined

  const commit = () => {
    onNameChange(card.id, draft.trim())
    setEditing(false)
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="relative w-32 aspect-square overflow-hidden rounded-lg border border-[#3c3c3c] bg-card shadow-sm touch-none select-none transition-all"
      {...attributes}
      {...listeners}
    >
      <img
        src={card.imageUrl}
        alt={card.name || '카드 이미지'}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      <div className="absolute bottom-0 left-0 right-0 p-1.5 pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center min-h-[40px]">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()} 
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(card.name)
                setEditing(false)
              }
            }}
            onBlur={commit}
            className="h-7 w-full rounded-md border border-gray-600 bg-black/60 px-1 text-center text-[11px] text-white focus:outline-none" 
          />
        ) : (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => {
              setDraft(card.name)
              setEditing(true)
            }}
            className={`w-full text-center text-[11px] font-medium break-all line-clamp-2 transition-colors
              ${card.name ? "text-white/90 hover:text-white" : "text-white/20 hover:text-white/40 font-light"}`}
            style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical' }}
          >
            {card.name || '이름 입력'}
          </button>
        )}
      </div>
    </div>
  )
}

function App() {
  const [columns, setColumns] = useState<Columns>({
    SS: [], S: [], A: [], B: [], C: [], STORAGE: [],
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newCards: CardData[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      imageUrl: URL.createObjectURL(file),
      name: '',
    }))
    setColumns((prev) => ({
      ...prev,
      STORAGE: [...prev.STORAGE, ...newCards],
    }))
    e.target.value = ''
  }

  // 🎯 ReUI 순정 애니메이션과 결합된 드래그 오버 핸들러
  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = active.data.current?.sortable?.containerId || active.id
    let overId = over.id
    
    const isContainer = TIER_ROWS.some(t => t.id === overId) || overId === STORAGE_ID
    let overContainer = isContainer ? overId : (over.data.current?.sortable?.containerId || over.id)

    if (activeContainer === overContainer) return

    setColumns((prev) => {
      const activeItems = prev[activeContainer] || []
      const overItems = prev[overContainer] || []

      const activeIndex = activeItems.findIndex((i) => i.id === active.id)
      let overIndex = overItems.findIndex((i) => i.id === overId)

      if (isContainer || overIndex === -1 || overIndex === overItems.length - 1) {
        overIndex = overItems.length
      }

      const newActiveItems = [...activeItems]
      const [movedItem] = newActiveItems.splice(activeIndex, 1)

      if (!movedItem) return prev

      const newOverItems = [...overItems]
      newOverItems.splice(overIndex, 0, movedItem)

      return {
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      }
    })
  }, [])

  const setCardName = useCallback((id: string, name: string) => {
    setColumns((prev) => {
      for (const key of Object.keys(prev)) {
        const idx = prev[key].findIndex((c) => c.id === id)
        if (idx !== -1) {
          const updated = [...prev[key]]
          updated[idx] = { ...updated[idx], name }
          return { ...prev, [key]: updated }
        }
      }
      return prev
    })
  }, [])

  const renderOverlay = ({ value, variant }: { value: string | number; variant: 'column' | 'item' }) => {
    if (variant !== 'item') return null
    for (const key of Object.keys(columns)) {
      const card = columns[key].find((c) => c.id === String(value))
      if (card) return <CardView card={card} onNameChange={setCardName} />
    }
    return null
  }

  return (
    <div className="flex h-screen flex-col gap-4 p-4 bg-[#1e1e1e] text-white">
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* 1. SS ~ C 등급 티어 리스트 섹션 (왼쪽 네온 컬러 라벨 판넬 적용) */}
          {TIER_ROWS.map((tier) => (
            <KanbanColumn key={tier.id} value={tier.id}>
              <div className="flex rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] overflow-hidden min-h-[140px]">
                
                {/* 🎯 왼쪽 등급 가로 라벨 판넬 박스 (은은한 배경색과 글자색 복구!) */}
                <div className={`flex w-16 items-center justify-center font-black border-r border-[#3c3c3c] select-none text-center text-sm ${tier.color}`}>
                  {tier.label}
                </div>

                {/* 우측 카드 전개 및 드롭 구역 */}
                <div className="flex-1 w-full">
                  <SortableContext items={columns[tier.id].map(c => c.id)} strategy={horizontalListSortingStrategy}>
                    <KanbanColumnContent
                      value={tier.id}
                      className="flex flex-1 w-full h-full flex-row flex-wrap items-center gap-3 p-3 transition-all duration-200"
                    >
                      {columns[tier.id].map((card) => (
                        <KanbanItem key={card.id} value={card.id}>
                          <CardView card={card} onNameChange={setCardName} />
                        </KanbanItem>
                      ))}
                    </KanbanColumnContent>
                  </SortableContext>
                </div>

              </div>
            </KanbanColumn>
          ))}

          {/* 2. 하단 STORAGE (보관함) 섹션 */}
          <KanbanColumn value={STORAGE_ID}>
            <div className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] overflow-hidden min-h-[160px]">
              {/* 상단 컨트롤 바 */}
              <div className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252526] px-4 py-2">
                <span className="text-sm font-bold text-gray-300">{STORAGE_ID} (보관함)</span>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 h-8">
                  <Upload className="w-4 h-4 mr-2" />
                  이미지 업로드
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              
              {/* 보관함 카드 풀 구역 */}
              <div className="flex-1 w-full">
                <SortableContext items={columns[STORAGE_ID].map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  <KanbanColumnContent
                    value={STORAGE_ID}
                    className="flex flex-1 w-full h-full flex-row flex-wrap items-center gap-3 p-4"
                  >
                    {columns[STORAGE_ID].map((card) => (
                      <KanbanItem key={card.id} value={card.id}>
                        <CardView card={card} onNameChange={setCardName} />
                      </KanbanItem>
                    ))}
                  </KanbanColumnContent>
                </SortableContext>
              </div>
            </div>
          </KanbanColumn>

          <KanbanOverlay>{renderOverlay}</KanbanOverlay>
        </div>
      </Kanban>
    </div>
  )
}

export default App