import { useCallback, useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { QRCodeSVG } from 'qrcode.react'
import { Upload, Link as LinkIcon, X, Plus, Trash2, ImageDown } from 'lucide-react'
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

// 💡 기본 티어 행의 색상 팔레트 (순환해서 새 행에 배정)
const TIER_COLORS = [
  'bg-red-500/30 text-red-200 font-black border-red-500/40',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
]

// 💡 각 티어 행의 메타데이터 (색상). 순서와 라벨은 상태에 보관합니다.
const TIER_COLORS_BY_ID: Record<string, string> = {
  SS: TIER_COLORS[0],
  S: TIER_COLORS[1],
  A: TIER_COLORS[2],
  B: TIER_COLORS[3],
  C: TIER_COLORS[4],
}

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
      data-dnd-item="true"
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

  // 💡 각 티어의 색상 클래스를 상태에 보관합니다. (기본값은 TIER_COLORS_BY_ID)
  const [tierColors, setTierColors] = useState<Record<string, string>>({ ...TIER_COLORS_BY_ID })

  const setTierLabel = useCallback((id: string, label: string) => {
    setTierLabels((prev) => ({ ...prev, [id]: label }))
  }, [])

  // 💡 새 티어 행을 추가합니다. STORAGE 직전에 삽입하고 색상/라벨을 배정합니다.
  const addTierRow = useCallback(() => {
    const id = `TIER_${crypto.randomUUID().slice(0, 8)}`
    setColumns((prev) => {
      const keys = Object.keys(prev)
      const storageIdx = keys.indexOf(STORAGE_ID)
      const newKeys = [...keys.slice(0, storageIdx), id, ...keys.slice(storageIdx)]
      const next: Columns = {}
      for (const key of newKeys) next[key] = prev[key] ?? []
      return next
    })
    setTierColors((prev) => ({ ...prev, [id]: TIER_COLORS[Object.keys(prev).length % TIER_COLORS.length] }))
    setTierLabels((prev) => ({ ...prev, [id]: '' }))
  }, [])

  // 💡 특정 티어 행을 삭제합니다. (STORAGE는 고정이라 제외)
  // 💡 행에 있던 카드는 사라지지 않고 대기 아이템으로 되돌려 보냅니다.
  const removeTierRow = useCallback((id: string) => {
    if (id === STORAGE_ID) return
    setColumns((prev) => {
      const cardsToMove = prev[id] ?? []
      const next: Columns = {}
      for (const key of Object.keys(prev)) {
        if (key !== id) next[key] = prev[key]
      }
      // 💡 삭제된 행의 카드를 대기 아이템 끝에 추가합니다.
      next[STORAGE_ID] = [...(next[STORAGE_ID] ?? []), ...cardsToMove]
      return next
    })
    setTierColors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setTierLabels((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // 💡 카드 이동은 라이브러리 기본 동작(라이브 미리보기 + 드롭 시 커밋)이 처리합니다.
  // onMove를 주면 라이브러리가 dragOver에서 조기 반환해서 카드가 실제로 안 옮겨지므로,
  // 카드 이동에는 onMove를 쓰지 않고 setColumns(onValueChange)로 위임합니다.

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 💡 캡처 대상: 티어 행만 포함하는 컨테이너 (대기 아이템 섹션 제외)
  const tierBoardRef = useRef<HTMLDivElement>(null)

  // 💡 'PNG로 저장' 버튼: 계산된 슬레이트 배경과 레이아웃 스타일을 강제 적용해 투명 배경을 방지합니다.
  const handleDownloadPNG = async () => {
    if (!tierBoardRef.current) return

    // 💡 html-to-image의 canvas 캐싱 버그를 피하기 위해, 클릭 사이에 메인 스레드를 잠시 내어줘서
    // 브라우저가 이전 캔버스 DOM 노드를 정리하고 다음 클릭에 깨끗하게 다시 렌더링되도록 합니다.
    const trigger = () => {
      try {
        // 💡 pixelRatio: 2로 캔버스 스케일 트리거를 강제해 html-to-image가 매번 새 캔버스를 생성하게 합니다.
        toPng(tierBoardRef.current, {
          cacheBust: false, // Turn off cache busting to protect local Blob URLs
          pixelRatio: 2,
          backgroundColor: '#0f172a', // Enforce solid dark slate background (bg-slate-900 equivalent)
          style: {
            padding: '24px',
            borderRadius: '12px',
          }
        }).then((dataUrl) => {
          const sanitizedTitle = boardTitle?.trim()
          const now = new Date()
          const pad = (n: number) => String(n).padStart(2, '0')
          const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
          const baseName = sanitizedTitle || 'tier-list'
          const fileName = `${baseName}-${timestamp}.png`

          const link = document.createElement('a')
          link.download = fileName
          link.href = dataUrl
          link.click()
        }).catch((error) => {
          console.error('Failed to export PNG:', error)
        })
      } catch (error) {
        console.error('Failed to export PNG:', error)
      }
    }

    // 💡 requestAnimationFrame으로 한 프레임만큼 지연시켜 이전 캔버스 노드가 정리된 뒤 캡처를 시작합니다.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(trigger, 0))
    } else {
      setTimeout(trigger, 0)
    }
  }

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
  const handleAddByUrl = useCallback(async () => {
    const targetUrl = typeof urlValue === 'string' ? urlValue.trim() : ''
    if (!targetUrl || isFetchingUrl) return
    setUrlError(null)

    // 💡 fetch/헤더 검사 없이 http(s) URL이면 바로 카드 추가. 깨진 이미지는 <img> onError가 처리
    const urlRegex = /^https?:\/\/[^\s]+$/i
    if (!urlRegex.test(targetUrl)) {
      setUrlError('http:// 또는 https:// 로 시작하는 유효한 URL을 입력해 주세요.')
      return
    }

    // 💡 카드 추가 전 CORS 검증: GET 요청이 성공해야만 외부 서버가 크로스오리진 접근을 허용한다는 뜻
    try {
      const response = await fetch(targetUrl, { method: 'GET', mode: 'cors' })
      if (!response.ok) throw new Error()

      // Success: Use the resolved redirect URL (e.g. response.url) to prevent picsum from changing upon PNG export later!
      const finalUrl = response.url
      const newCard: CardData = { id: crypto.randomUUID(), imageUrl: finalUrl, name: '' }
      setColumns((prev) => ({ ...prev, STORAGE: [...prev.STORAGE, newCard] }))
      setUrlValue('')
    } catch (error) {
      // Only blocks actual strict firewall violations (like Naver News URL)
      alert(
        '선택하신 이미지는 해당 웹사이트의 보안 정책(CORS)으로 인해 주소로 추가할 수 없습니다. 대신 이미지를 마우스 우클릭 후 \'이미지 복사\'를 선택하여, 화면 위에서 Ctrl+V(붙여넣기)로 추가해 주세요!'
      )
      setUrlValue('')
    }
  }, [urlValue, isFetchingUrl])

  // 💡 전역 Ctrl+V 리스너: 이미지(블롭)는 즉시 보관함에 추가, 유효한 URL 텍스트는 handleAddByUrl로 처리
  useEffect(() => {
    const urlRegex = /^https?:\/\/[^\s]+$/i
    const onPaste = (e: ClipboardEvent) => {
      // 이미지가 있는 경우 (이미지 파일 붙여넣기)
      const items = e.clipboardData?.items
      if (items) {
        for (const item of Array.from(items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (!file) continue
            const newCard: CardData = {
              id: crypto.randomUUID(),
              imageUrl: URL.createObjectURL(file),
              name: '',
            }
            setColumns((prev) => ({ ...prev, STORAGE: [...prev.STORAGE, newCard] }))
          }
        }
      }

      // 텍스트가 유효한 URL인 경우: 입력창에 채운 뒤 기존 핸들러로 처리
      const text = (e.clipboardData?.getData('text/plain') ?? '').trim()
      if (urlRegex.test(text)) {
        setUrlValue(text)
        handleAddByUrl()
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleAddByUrl])

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

  // 💡 전역 파일 드래그 & 드롭: OS 탐색기에서 이미지를 끌어다 놓으면 즉시 보관함에 카드 추가
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setActiveFileDragRowId(null)
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    const newCards: CardData[] = Array.from(files).filter((f) => f.type.startsWith('image/')).map((file) => ({
      id: crypto.randomUUID(),
      imageUrl: URL.createObjectURL(file),
      name: '',
    }))
    if (newCards.length === 0) return
    setColumns((prev) => ({ ...prev, STORAGE: [...prev.STORAGE, ...newCards] }))
  }, [])

  // 💡 Dropzone Overlay 방식: 행 전체를 드롭 타겟으로 표시하고, 인덱스 계산 없이 끝에 추가
  const [activeFileDragRowId, setActiveFileDragRowId] = useState<string | null>(null)

  // 💡 특정 티어 행에 파일을 드롭하면 해당 행 끝에 카드 추가 (전역 드롭으로 버블업 방지)
  const handleDropIntoRow = useCallback((e: React.DragEvent<HTMLDivElement>, rowId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveFileDragRowId(null)
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    const newCards: CardData[] = Array.from(files).filter((f) => f.type.startsWith('image/')).map((file) => ({
      id: crypto.randomUUID(),
      imageUrl: URL.createObjectURL(file),
      name: '',
    }))
    if (newCards.length === 0) return
    setColumns((prev) => {
      const existing = prev[rowId] ?? []
      return { ...prev, [rowId]: [...existing, ...newCards] }
    })
  }, [])

  // 💡 행 드래그 오버: 해당 행 ID를 활성 상태로 설정 (스로틀링 불필요 — 동일 값이면 React가 리렌더 스킵)
  const handleRowDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, rowId: string) => {
    e.preventDefault()
    setActiveFileDragRowId(rowId)
  }, [])

  // 💡 행 드래그 리브: 활성 상태 초기화
  const handleRowDragLeave = useCallback(() => {
    setActiveFileDragRowId(null)
  }, [])

  // 💡 티어 행을 드래그할 때, 카드가 아닌 "행 전체"를 따라다니는 미리보기(오버레이)입니다.
  const renderColumnOverlay = ({ value }: { value: string | number }) => {
    const tierId = String(value)
    if (tierId === STORAGE_ID || !(tierId in columns)) return null
    return (
      <div className="flex rounded-lg border-2 border-dashed border-white/40 bg-[#2d2d2d]/95 shadow-xl overflow-hidden min-h-[140px]">
        <div className={`flex w-16 items-center justify-center border-r border-[#3c3c3c] select-none text-center text-sm ${tierColors[tierId]}`}>
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
    <div className="flex min-h-screen flex-col gap-4 p-4 bg-[#0f172a] text-white" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* 💡 캡처 대상: 제목 + 티어 행 + 하단 액션 버튼을 하나의 단단한 사진으로 감싸는 메인 외부 컨테이너 */}
      <div ref={tierBoardRef} className="flex flex-1 flex-col gap-4 rounded-xl bg-[#0f172a] p-6">
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
              const color = tierColors[id] ?? TIER_COLORS[0]
              return (
                <KanbanColumn key={id} value={id}>
                  <div className="group relative flex rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] overflow-hidden min-h-[140px]" onDragOver={(e) => handleRowDragOver(e, id)} onDragLeave={handleRowDragLeave} onDrop={(e) => handleDropIntoRow(e, id)}>

                    {/* 🎯 왼쪽 등급 가로 라벨 판넬 박스 (클릭해서 이름 수정 가능!) */}
                    <div className={`flex w-16 items-center justify-center border-r border-[#3c3c3c] select-none text-center text-sm ${color}`}>
                      <TierLabel value={tierLabels[id]} color={color} onChange={(label) => setTierLabel(id, label)} />
                    </div>

                    {/* 🎯 행 전체를 드래그해서 순서를 바꿀 수 있는 핸들 (카드 드래그와 충돌 방지용) */}
                    <KanbanColumnHandle className="absolute left-0 top-0 bottom-0 w-2 cursor-grab active:cursor-grabbing bg-white/5 hover:bg-white/15 transition-colors z-10" />

                    {/* 🎯 행 삭제 버튼 (마우스를 올리면 나타남) */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeTierRow(id)}
                      title="티어 행 삭제"
                      className="absolute top-1 right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-gray-400 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    {/* 우측 카드 전개 및 드롭 구역 */}
                    <div className="flex-1 w-full">
                      <SortableContext items={columns[id].map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        <KanbanColumnContent
                          value={id}
                          className="flex flex-1 w-full h-full flex-row flex-wrap items-center gap-3 p-3 transition-all duration-200"
                        >
                          {columns[id].map((card) => (
                            <KanbanItem key={card.id} value={card.id}>
                              <CardView card={card} onNameChange={setCardName} onDelete={deleteCard} />
                            </KanbanItem>
                          ))}
                        </KanbanColumnContent>
                      </SortableContext>
                    </div>

                    {/* 💡 Dropzone Overlay: 파일 드래그 중 해당 행 위에 글래스모피즘 배너 표시 */}
                    {activeFileDragRowId === id && (
                      <div className="absolute inset-0 bg-[#0f172a]/80 border-2 border-dashed border-blue-500/50 rounded-xl flex items-center justify-center pointer-events-none z-50">
                        <span className="text-blue-400 font-semibold text-sm animate-pulse">+ 여기에 드롭하여 이 티어에 즉시 추가</span>
                      </div>
                    )}

                  </div>
                </KanbanColumn>
              )
            })}

            {/* 🎯 새 티어 행 추가 + PNG로 저장 버튼 (STORAGE 직전, 동일한 프리미엄 다크 스타일) */}
            <div className="flex flex-row items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={addTierRow}
                className="h-auto flex-1 border border-white/10 bg-white/5 text-gray-300 font-medium py-2.5 px-4 rounded-xl transition-all hover:bg-white/10 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                티어 행 추가
              </Button>
              {/* 🎯 PNG로 저장 버튼 (티어 보드만 캡처) */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPNG}
                className="h-auto flex-1 border border-white/10 bg-white/5 text-gray-300 font-medium py-2.5 px-4 rounded-xl transition-all hover:bg-white/10 hover:text-white"
              >
                <ImageDown className="w-4 h-4 mr-2 shrink-0" />
                PNG로 저장
              </Button>
              {/* 🎯 QR 코드 워터마크 (우측 하단, 캡처 프레임 안에 자연스럽게 클립) */}
              <div className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity shrink-0">
                <QRCodeSVG
                  value="https://devbwoh.github.io/tier-drop/"
                  size={60}
                  bgColor="#0f172a"
                  fgColor="#ffffff"
                  level="L"
                />
                <span className="text-[10px] text-gray-400 font-medium tracking-wider">tier-drop</span>
              </div>
            </div>

            {/* 2. 하단 대기 아이템 섹션 */}
            <KanbanColumn value={STORAGE_ID}>
              <div className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] overflow-hidden min-h-[160px]">
                {/* 상단 컨트롤 바 */}
                <div className="flex flex-col gap-2 border-b border-[#3c3c3c] bg-[#252526] px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-300">대기 아이템</span>
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
                        placeholder="이미지 URL 주소 또는 이미지 붙여넣기 (Ctrl+V)"
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

                {/* 대기 아이템 풀 구역 */}
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

      {/* 💡 최하단 저작권/데이터 안내 문구 */}
      <footer className="shrink-0 px-2 pb-1 text-center text-xs leading-relaxed text-gray-500">
        본 사이트는 사용자의 어떠한 이미지 데이터도 서버에 수집하거나 저장하지 않습니다. 모든 이미지의 권리는 원저작권자에게 있으며, 개인이 추가한 이미지로 인해 발생하는 저작권 관련 문제의 책임은 사용자 본인에게 있습니다.
      </footer>
      </div>
    </div>
  )
}

export default App
