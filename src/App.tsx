import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSortable } from '@dnd-kit/sortable'
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
  { id: 'SS', label: 'SS' },
  { id: 'S', label: 'S' },
  { id: 'A', label: 'A' },
  { id: 'B', label: 'B' },
  { id: 'C', label: 'C' },
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
      // 💡 relative를 주어 내부 텍스트 상자가 이미지 위로 둥둥 떠서 달라붙을 기준점을 잡습니다.
      className="relative w-32 aspect-square overflow-hidden rounded-lg border border-[#3c3c3c] bg-card shadow-sm touch-none select-none transition-all"
      {...attributes}
      {...listeners}
    >
      {/* 1. 바탕에 깔리는 고화질 포켓몬/로봇 이미지 */}
      <img
        src={card.imageUrl}
        alt={card.name || '카드 이미지'}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* 2. 이미지 하단에 얹어지는 반투명 검은색 그라데이션 및 흰색 텍스트 레이어 */}
      <div 
        // 💡 absolute bottom-0: 이미지 맨 밑바닥에 딱 붙입니다.
        // bg-gradient-to-t from-black/80 to-black/0: 밑에서 위로 갈수록 투명해지는 검은색 그라데이션 그늘막을 만듭니다.
        className="absolute bottom-0 left-0 right-0 p-1.5 pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center min-h-[40px]"
      >
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
            // 💡 입력창도 다크 테마 배경에 어울리도록 배경을 살짝 어둡게 투명 처리합니다.
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
            /* 💡 이름 유무에 따른 가독성 저격 스타일:
              - card.name이 있으면 선명한 흰색(text-white/90 hover:text-white)
              - card.name이 없으면 아주 흐린 투명 흰색(text-white/20 hover:text-white/40)으로 거의 티가 나지 않게 바뀝니다! 🎯
            */
            className={`w-full text-center text-[11px] font-medium break-all line-clamp-2 transition-colors
              ${card.name 
                ? "text-white/90 hover:text-white" 
                : "text-white/20 hover:text-white/40 font-light"
              }`}
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
  
  // 🎯 실시간 드래그 중인 요소를 추적하기 위한 상태값 추가
  const [activeId, setActiveId] = useState<string | null>(null)
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

  // 🎯 핵심: 드래그가 공중에 떠다니는 동안(DragOver) 미리 배열 순서를 바꿔서 공간을 벌려주는 마법의 융합 로직
  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = active.data.current?.sortable?.containerId || active.id
    const overContainer = over.data.current?.sortable?.containerId || over.id

    if (activeContainer === overContainer) return // 같은 방 안이면 전개 유지

    setColumns((prev) => {
      const activeItems = prev[activeContainer] || []
      const overItems = prev[overContainer] || []

      const activeIndex = activeItems.findIndex((i) => i.id === active.id)
      let overIndex = overItems.findIndex((i) => i.id === over.id)

      if (overIndex === -1) overIndex = overItems.length

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

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = () => {
    setActiveId(null)
  }

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
      {/* 🎯 dnd-kit 컨텍스트와 ReUI Kanban 연동 브릿지 확장 */}
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {TIER_ROWS.map((tier) => (
            <KanbanColumn key={tier.id} value={tier.id}>
              <div className="mb-2 px-1 text-sm font-bold">{tier.label}</div>
              <KanbanColumnContent
                value={tier.id}
                // 💡 flex-row와 transition 애니메이션 유연화
                className="flex min-h-[110px] flex-row flex-wrap gap-3 rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] p-3 transition-all duration-200"
              >
                {columns[tier.id].map((card) => (
                  <KanbanItem key={card.id} value={card.id}>
                    <CardView card={card} onNameChange={setCardName} />
                  </KanbanItem>
                ))}
              </KanbanColumnContent>
            </KanbanColumn>
          ))}

          <KanbanColumn value={STORAGE_ID}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold">{STORAGE_ID} (보관함)</span>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
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
            <KanbanColumnContent
              value={STORAGE_ID}
              className="flex min-h-[140px] flex-row flex-wrap gap-3 rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] p-3"
            >
              {columns[STORAGE_ID].map((card) => (
                <KanbanItem key={card.id} value={card.id}>
                  <CardView card={card} onNameChange={setCardName} />
                  </KanbanItem>
                ))}
            </KanbanColumnContent>
          </KanbanColumn>

          <KanbanOverlay>{renderOverlay}</KanbanOverlay>
        </div>
      </Kanban>
    </div>
  )
}

export default App