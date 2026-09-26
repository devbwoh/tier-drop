import { useCallback, useRef, useState } from 'react'
import { Upload, Link as LinkIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSortable, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
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
  { id: 'SS', color: 'bg-red-500/30 text-red-200 font-black border-red-500/40' },
  { id: 'S', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'A', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'B', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'C', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
]

const STORAGE_ID = 'STORAGE'

const noopDelete = () => {}

// 💡 티어 라벨을 클릭해서 수정할 수 있는 편집 컴포넌트입니다.
function TierLabel({
  value,
  color,
  onChange,
}: {
  value: string
  color: string
  onChange: (label: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    onChange(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        onBlur={commit}
        // 💡 bg-black/40(어두운 반투명)과 깔끔한 흰색 테두리를 적용했습니다.
        className="h-full w-full border border-white/20 bg-black/40 p-0 text-center font-bold text-white outline-none ring-0 focus:border-white/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md"
        style={{ boxShadow: 'none' }}
      />
    )
  }

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      // 💡 별도의 배경 덧칠 없이 글자만 중앙에 깔끔하게 띄우도록 투명화했습니다.
      className={`w-full h-full cursor-pointer select-none bg-transparent text-center font-bold outline-none border-0 transition-colors hover:brightness-125 ${color}`}
      title="티어 이름 수정"
    >
      {value || '이름 입력'}
    </button>
  )
}

// 💡 props에 onDelete를 추가합니다.
function CardView({
  card,
  onNameChange,
  onDelete,
}: {
  card: CardData
  onNameChange: (id: string, name: string) => void
  onDelete: (id: string) => void
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
    // 💡 group 클래스를 추가하여 마우스를 올렸을 때만 삭제 버튼이 보이도록 유도합니다.
    <div 
      ref={setNodeRef}
      style={style}
      className="group relative w-32 aspect-square overflow-hidden rounded-lg border border-[#3c3c3c] bg-card shadow-sm touch-none select-none transition-all"
      {...attributes}
      {...listeners}
    >
      {/* 1. 이미지 레이어 (로딩 실패 시 카드를 상태에서 자동 제거) */}
      <img
        src={card.imageUrl}
        alt={card.name || '카드 이미지'}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        onError={() => onDelete(card.id)}
      />

      {/* 🎯 2. 개별 카드 우측 상단 '삭제 (X)' 버튼 */}
      <button
        type="button"
        // 💡 드래그 이벤트와 클릭 이벤트가 겹쳐서 오작동하지 않도록 방어막을 칩니다.
        onPointerDown={(e) => e.stopPropagation()} 
        onClick={() => onDelete(card.id)}
        // 💡 평소에는 투명(opacity-0)하다가 마우스를 카드 위에 올리면 스윽 나타납니다(group-hover:opacity-100).
        className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-gray-400 hover:bg-red-600 hover:text-white text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        title="카드 삭제"
      >
        ✕
      </button>

      {/* 3. 하단 이름 레이어 */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 pt-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex items-end justify-center min-h-[40px]">
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
  const [boardTitle, setBoardTitle] = useState('나만의 티어표')
  // 💡 카드 데이터만 보관합니다. 행 순서는 columns의 키 순서(Object.keys)가 곧 정렬 기준입니다.
  const [columns, setColumns] = useState<Columns>({
    SS: [], S: [], A: [], B: [], C: [], STORAGE: [],
  })
  // 💡 각 티어의 표시 이름을 상태에 보관합니다. (기본값은 티어 ID)
  const [tierLabels, setTierLabels] = useState<Record<string, string>>({
    SS: 'SS', S: 'S', A: 'A', B: 'B', C: 'C',
  })

  const setTierLabel = useCallback((id: string, label: string) => {
    setTierLabels((prev) => ({ ...prev, [id]: label }))
  }, [])

  // 💡 카드 이동은 라이브러리 기본 동작(라이브 미리보기 + 드롭 시 커밋)이 처리합니다.
  // onMove를 주면 라이브러리가 dragOver에서 조기 반환해서 카드가 실제로 안 옮겨지므로,
  // 카드 이동에는 onMove를 쓰지 않고 setColumns(onValueChange)로 위임합니다.

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 💡 URL 입력 상태 및 로딩/오류 표시용 상태
  const [urlValue, setUrlValue] = useState('')
  const [isFetchingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

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

  // 💡 입력창에 포커스(클릭) 시 클립보드의 유효한 URL이 있으면 즉시 자동 채우기
  const handleUrlFocus = async () => {
    try {
      if (!navigator.clipboard?.readText) return
      const text = (await navigator.clipboard.readText()).trim()
      // 일반 텍스트/무관한 스니펫을 걸러내기 위해 http(s):// 로 시작하는 URL만 허용
      const urlRegex = /^https?:\/\/[^\s]+$/i
      if (!text || !urlRegex.test(text)) return
      setUrlValue(text)
    } catch {
      // 클립보드 권한 거부 등은 조용히 무시
    }
  }

  // 💡 붙여넣은 URL이 http(s)인지만 확인하고 즉시 보관함에 카드 추가 (CORS 차단 방지용)
  const handleAddByUrl = () => {
    const url = urlValue.trim()
    if (!url || isFetchingUrl) return
    setUrlError(null)

    // 💡 fetch/헤더 검사 없이 http(s) URL이면 바로 카드 추가. 깨진 이미지는 <img> onError가 처리
    const urlRegex = /^https?:\/\/[^\s]+$/i
    if (!urlRegex.test(url)) {
      setUrlError('http:// 또는 https:// 로 시작하는 유효한 URL을 입력해 주세요.')
      return
    }

    const newCard: CardData = { id: crypto.randomUUID(), imageUrl: url, name: '' }
    setColumns((prev) => ({ ...prev, STORAGE: [...prev.STORAGE, newCard] }))
    setUrlValue('')
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

  // 💡 티어 행을 드래그할 때, 카드가 아닌 "행 전체"를 따라다니는 미리보기(오버레이)입니다.
  const renderColumnOverlay = ({ value }: { value: string | number }) => {
    const tierId = String(value)
    if (tierId === STORAGE_ID || !TIER_ROWS.some((t) => t.id === tierId)) return null
    const tier = TIER_ROWS.find((t) => t.id === tierId)!
    return (
      <div className="flex rounded-lg border-2 border-dashed border-white/40 bg-[#2d2d2d]/95 shadow-xl overflow-hidden min-h-[140px]">
        <div className={`flex w-16 items-center justify-center border-r border-[#3c3c3c] select-none text-center text-sm ${tier.color}`}>
          {tierLabels[tierId]}
        </div>
        <div className="flex-1 flex flex-row flex-wrap items-center gap-3 p-3">
          {columns[tierId].map((card) => (
            <CardView key={card.id} card={card} onNameChange={setCardName} onDelete={noopDelete} />
          ))}
        </div>
      </div>
    )
  }

  const renderOverlay = ({ value, variant }: { value: string | number; variant: 'column' | 'item' }) => {
    if (variant === 'column') return renderColumnOverlay({ value })
    for (const key of Object.keys(columns)) {
      const card = columns[key].find((c) => c.id === String(value))
      if (card) return <CardView card={card} onNameChange={setCardName} onDelete={noopDelete} />
    }
    return null
  }

  // 🎯 특정 ID의 카드를 찾아서 전체 칸에서 지워버리는 격리 함수
  const deleteCard = useCallback((id: string) => {
    setColumns((prev) => {
      const updated = { ...prev }
      
      // 모든 행(SS, S, A, B, C, STORAGE)을 돌면서 해당 카드를 찾아 제거합니다.
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].filter((card) => card.id !== id)
      }
      
      return updated
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 bg-[#1e1e1e] text-white">
      <header className="shrink-0 rounded-xl border border-[#3c3c3c] bg-[#252526] p-4 shadow-sm">
        <Input
          id="board-title"
          value={boardTitle}
          onChange={(e) => setBoardTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="h-auto border-none bg-transparent px-0 py-0 text-center text-3xl font-black text-white shadow-none outline-none placeholder:text-gray-600 focus-visible:ring-0 md:text-5xl"
        />
      </header>
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
      >
        {/* 💡 티어 행을 세로 방향으로 정렬할 수 있는 SortableContext (STORAGE는 고정이라 제외) */}
        <SortableContext items={Object.keys(columns).filter((id) => id !== STORAGE_ID)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {/* 1. SS ~ C 등급 티어 리스트 섹션 (왼쪽 네온 컬러 라벨 판넬 적용) */}
            {Object.keys(columns).filter((id) => id !== STORAGE_ID).map((id) => {
              const tier = TIER_ROWS.find((t) => t.id === id)!
              return (
                <KanbanColumn key={tier.id} value={tier.id}>
                  <div className="relative flex rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] overflow-hidden min-h-[140px]">

                    {/* 🎯 왼쪽 등급 가로 라벨 판넬 박스 (클릭해서 이름 수정 가능!) */}
                    <div className={`flex w-16 items-center justify-center border-r border-[#3c3c3c] select-none text-center text-sm ${tier.color}`}>
                      <TierLabel value={tierLabels[tier.id]} color={tier.color} onChange={(label) => setTierLabel(tier.id, label)} />
                    </div>

                    {/* 🎯 행 전체를 드래그해서 순서를 바꿀 수 있는 핸들 (카드 드래그와 충돌 방지용) */}
                    <KanbanColumnHandle className="absolute left-0 top-0 bottom-0 w-2 cursor-grab active:cursor-grabbing bg-white/5 hover:bg-white/15 transition-colors z-10" />

                    {/* 우측 카드 전개 및 드롭 구역 */}
                    <div className="flex-1 w-full">
                      <SortableContext items={columns[tier.id].map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        <KanbanColumnContent
                          value={tier.id}
                          className="flex flex-1 w-full h-full flex-row flex-wrap items-center gap-3 p-3 transition-all duration-200"
                        >
                          {columns[tier.id].map((card) => (
                            <KanbanItem key={card.id} value={card.id}>
                              <CardView card={card} onNameChange={setCardName} onDelete={deleteCard} />
                            </KanbanItem>
                          ))}
                        </KanbanColumnContent>
                      </SortableContext>
                    </div>

                  </div>
                </KanbanColumn>
              )
            })}

            {/* 2. 하단 STORAGE (보관함) 섹션 */}
            <KanbanColumn value={STORAGE_ID}>
              <div className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] overflow-hidden min-h-[160px]">
                {/* 상단 컨트롤 바 */}
                <div className="flex flex-col gap-2 border-b border-[#3c3c3c] bg-[#252526] px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-300">{STORAGE_ID} (보관함)</span>
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 h-8 w-36">
                      <Upload className="w-4 h-4 mr-2 shrink-0" />
                      이미지 업로드
                    </Button>
                  </div>

                  {/* 💡 URL 붙여넣기 입력줄 */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Input
                        value={urlValue}
                        onFocus={handleUrlFocus}
                        onChange={(e) => { setUrlValue(e.target.value); if (urlError) setUrlError(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddByUrl() }}
                        placeholder="이미지 URL을 붙여넣고 Enter"
                        className="h-8 w-full bg-black/30 pr-8 text-sm text-white placeholder:text-gray-500"
                      />
                      {/* 💡 텍스트가 있을 때만 나타나는 '지우기' 버튼 (입력창 우측 안쪽에 절대 위치) */}
                      {urlValue && (
                        <button
                          type="button"
                          onClick={() => setUrlValue('')}
                          title="URL 지우기"
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Button size="sm" onClick={handleAddByUrl} disabled={isFetchingUrl || !urlValue.trim()} className="bg-green-600 hover:bg-green-700 h-8 w-36 shrink-0">
                      <LinkIcon className={`w-4 h-4 mr-2 shrink-0 ${isFetchingUrl ? 'animate-spin' : ''}`} />
                      {isFetchingUrl ? '불러오는 중...' : 'URL로 추가'}
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-xs text-red-400">{urlError}</p>
                  )}
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
                          <CardView card={card} onNameChange={setCardName} onDelete={deleteCard} />
                        </KanbanItem>
                      ))}
                    </KanbanColumnContent>
                  </SortableContext>
                </div>
              </div>
            </KanbanColumn>

            <KanbanOverlay>{renderOverlay}</KanbanOverlay>
          </div>
        </SortableContext>
      </Kanban>
    </div>
  )
}

export default App
