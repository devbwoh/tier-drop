import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanOverlay,
} from '@/components/reui/kanban'

import { useSortable } from '@dnd-kit/sortable'


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
    opacity: isDragging ? 0.5 : 1, 
  } : undefined

  const commit = () => {
    onNameChange(card.id, draft.trim())
    setEditing(false)
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="w-32 overflow-hidden rounded-lg border bg-card shadow-sm touch-none select-none"
      {...attributes}
      {...listeners}
    >
      <img
        src={card.imageUrl}
        alt={card.name || '카드 이미지'}
        className="aspect-square w-full object-cover"
        draggable={false}
      />
      {editing ? (
        <div className="p-1.5"> {/* 💡 입력창 여백을 위한 감싸는 상자 추가 */}
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()} 
            onBlur={commit}
            onKeyDown={(e) => {
              // 🎯 핵심: 입력창 안에서 일어나는 모든 키보드 이벤트가 
              // 부모 dnd-kit 엔진으로 흘러 들어가 방해하지 않도록 격리합니다!
              e.stopPropagation(); 

              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(card.name)
                setEditing(false)
              }
            }}
            className="h-8 w-full rounded-md border px-2 text-center text-xs" 
          />
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={() => {
            setDraft(card.name)
            setEditing(true)
          }}
          /* 💡 첫 글자부터 2줄 제한 마법의 클래스:
            - items-start / pt-1.5: 중앙 정렬을 버리고 무조건 '맨 위(첫 줄)'부터 글자를 채웁니다. 상단 여백을 살짝 줍니다.
            - display를 block 또는 grid 대신 'display: -webkit-box' 속성으로 명시해 주어야 line-clamp가 첫 단어부터 정확히 계산합니다.
            - Tailwind v4 및 최신 브라우저 규격에 맞춰 단어 쪼갬 방식을 'break-all'로 고정해 줍니다.
          */
          className="w-full h-10 max-h-10 text-center text-xs text-muted-foreground hover:bg-accent px-2 pt-1.5 overflow-hidden break-all line-clamp-2"
          style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical' }} // 🎯 브라우저 엔진에게 첫 글자부터 2줄 제한하라고 쐐기를 박는 코드
        >
          {card.name || '이름 입력'}
        </button>
      )}
    </div>
  )
}

function App() {
  const [columns, setColumns] = useState<Columns>({
    SS: [],
    S: [],
    A: [],
    B: [],
    C: [],
    STORAGE: [],
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
    // 🎯 순서 변경: 기존 카드들(...prev.STORAGE)을 왼쪽에 먼저 두고, 
    // 새 카드들(...newCards)을 우측 맨 뒤로 붙입니다!
    STORAGE: [...prev.STORAGE, ...newCards], 
  }))
  
  e.target.value = ''
}

  const handleMove = useCallback(
  (event: {
    activeContainer: string
    activeIndex: number
    overContainer: string
    overIndex: number
  }) => {
    setColumns((prev) => {
      const { activeContainer, activeIndex, overContainer, overIndex } = event

      if (!prev[activeContainer] || !prev[overContainer]) return prev

      const fromList = [...prev[activeContainer]]

      // 1. [행 내부 정렬] 같은 등급 칸 안에서 순서 바꿀 때
      if (activeContainer === overContainer) {
        const result = [...fromList]
        const [removed] = result.splice(activeIndex, 1)
        result.splice(overIndex, 0, removed)
        
        return {
          ...prev,
          [activeContainer]: result
        }
      }

      // 2. [다른 행으로 이동] 타겟 행으로 드롭할 때
      const toList = [...prev[overContainer]]
      const [movedItem] = fromList.splice(activeIndex, 1)

      if (!movedItem) return prev

      // 🎯 [핵심 보정] 드롭 대상이 '마지막 카드' 근처이거나 빈 공간일 때 
      // 인덱스를 맨 끝(toList.length)으로 밀어주는 보정 규칙 추가
      let targetIndex = overIndex
      
      if (targetIndex === -1 || targetIndex >= toList.length) {
        // 완전히 비어있거나 경계를 넘어섰을 때 맨 뒤로
        toList.push(movedItem)
      } else if (targetIndex === toList.length - 1) {
        // 💡 꼼수 차단: AI와 브라우저가 마지막 카드의 '앞'으로 인식한 경우, 
        // 유저가 행 끝 영역에 놓았다고 판단하여 맨 뒤에 온전하게 밀어 넣습니다.
        toList.push(movedItem)
      } else {
        // 그 외 카드들 사이 정조준 자리는 그대로 끼워 넣기
        toList.splice(targetIndex, 0, movedItem)
      }

      return {
        ...prev,
        [activeContainer]: fromList,
        [overContainer]: toList,
      }
    })
  },
  []
)

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
    <div className="flex h-screen flex-col gap-4 p-4">
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
        onMove={handleMove}
      >
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {TIER_ROWS.map((tier) => (
            <KanbanColumn key={tier.id} value={tier.id}>
              <div className="mb-2 px-1 text-sm font-bold">{tier.label}</div>
              <KanbanColumnContent
                value={tier.id}
                className="flex min-h-[80px] flex-row flex-wrap gap-3 rounded-lg border bg-muted/50 p-2"
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
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload />
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
              className="flex min-h-[120px] flex-row flex-wrap gap-3 rounded-lg border bg-muted/50 p-2"
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
