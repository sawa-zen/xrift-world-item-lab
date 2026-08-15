import { Text } from '@react-three/drei'
import { Interactable, useFileInput, useSharedFile, useXRift } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'
import { Component } from 'react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { FittedSketch } from './FittedSketch'

// ===== 3dgs ミュージアム島の展示台（Gallery/Pedestal）と同じ寸法・材質 =====
const BASE_W = 0.9
const BASE_D = 0.9
const BASE_H = 0.6
const SLAB_W = 1.0
const SLAB_D = 1.0
const SLAB_H = 0.08
const MAT_H = 0.01
const PLATE_W = 0.72
const PLATE_H = 0.26
const PLATE_TOP_GAP = BASE_H - 0.35

// 素材は museum.glb に依存せず、展示台のフォールバック色をそのまま使う
const CONCRETE = '#dcdce0' // コンクリ台座（PlazaInner）
const WOOD = '#8a6a45' // 正面プレート（WoodDeck）
const FRAME = '#2b2b33' // プレート枠（Stage）
const FELT = '#8e1c1c' // 天面の赤フェルトマット
const TEXT_COLOR = '#ffffff'

/** 台座天面（マット上面）の高さ。作品はここに載せる */
const TOP_Y = BASE_H + SLAB_H + MAT_H
const MAX_SIZE = 1.2
const MAX_NAME_LEN = 12

const truncate = (s: string, n = MAX_NAME_LEN) =>
  s.length > n ? `${s.slice(0, n)}…` : s

interface Exhibit {
  url: string
  name: string
  blobUrl?: string
}

interface OpenBrushDisplayStandProps {
  position?: [number, number, number]
}

type Status = 'empty' | 'loading' | 'ready' | 'error'

/** GLB 読み込み失敗時にエラー状態へ遷移させる ErrorBoundary */
class SketchErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export const OpenBrushDisplayStand: React.FC<OpenBrushDisplayStandProps> = ({
  position = [0, 0, 0],
}) => {
  const { baseUrl } = useXRift()
  const { requestFileInput } = useFileInput()
  const { uploadSharedFile } = useSharedFile()

  const [exhibit, setExhibit] = useState<Exhibit | null>({
    url: `${baseUrl}openbrush-sketch.glb`,
    name: 'サンプル作品',
  })
  const [status, setStatus] = useState<Status>('loading')
  const [uploading, setUploading] = useState<number | null>(null)

  const jpFont = `${baseUrl}jp-font.woff`

  const prevBlobUrlRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prev = prevBlobUrlRef.current
    prevBlobUrlRef.current = exhibit?.blobUrl
    if (prev && prev !== exhibit?.blobUrl) URL.revokeObjectURL(prev)
  }, [exhibit])

  const uploadFile = () => {
    requestFileInput({
      id: 'openbrush-upload',
      accept: '.glb',
      maxSize: 50 * 1024 * 1024,
      onSelect: async (files) => {
        const file = files[0]
        if (!file) return
        try {
          setUploading(0)
          const result = await uploadSharedFile(file, (p) => setUploading(p))
          if (result.id === 'dummy-id') {
            // 開発環境のデフォルト実装はダミー URL を返すためローカル表示にフォールバック
            const blobUrl = URL.createObjectURL(file)
            setExhibit({ url: blobUrl, name: file.name, blobUrl })
          } else {
            setExhibit({ url: result.publicUrl, name: file.name })
          }
          setStatus('ready')
        } catch {
          setStatus('error')
        } finally {
          setUploading(null)
        }
      },
      onError: () => setStatus('error'),
    })
  }

  const clearExhibit = () => {
    setExhibit((prev) => {
      if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl)
      return null
    })
    setStatus('empty')
  }

  // プレートの文字列（アップロード進捗 > エラー > 作品名 > 空き台）
  const plateLabel =
    uploading !== null
      ? `アップロード中 ${Math.round(uploading)}%`
      : status === 'error'
        ? 'エラーが発生しました'
        : exhibit
          ? truncate(exhibit.name)
          : '空き展示台'

  // プレートの向き（ローカル +Z 面＝スポーン側を向く）
  const plateY = BASE_H - PLATE_TOP_GAP // = 0.35
  const plateZ = BASE_D / 2 + 0.011

  return (
    <group position={position}>
      {/* 台座本体（直方体・貫通防止コライダー付き）。クリックでアップロード */}
      <RigidBody type="fixed" colliders="cuboid">
        <Interactable
          id="openbrush-upload"
          onInteract={() => uploadFile()}
          interactionText={exhibit ? '作品を差し替える' : '作品をアップロード'}
        >
          <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[BASE_W, BASE_H, BASE_D]} />
            <meshLambertMaterial color={CONCRETE} />
          </mesh>
        </Interactable>
      </RigidBody>

      {/* 天面スラブ */}
      <mesh position={[0, BASE_H + SLAB_H / 2, 0]} castShadow>
        <boxGeometry args={[SLAB_W, SLAB_H, SLAB_D]} />
        <meshLambertMaterial color={CONCRETE} />
      </mesh>

      {/* 赤フェルトのマット（天面スラブの上） */}
      <mesh position={[0, BASE_H + SLAB_H + MAT_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[SLAB_W, MAT_H, SLAB_D]} />
        <meshStandardMaterial color={FELT} roughness={0.95} metalness={0} />
      </mesh>

      {/* 展示スケッチ（マット上面に載せる） */}
      {exhibit && status !== 'error' && (
        <SketchErrorBoundary key={exhibit.url} onError={() => setStatus('error')}>
          <FittedSketch
            url={exhibit.url}
            position={[0, TOP_Y, 0]}
            maxSize={MAX_SIZE}
            onLoaded={() => setStatus('ready')}
          />
        </SketchErrorBoundary>
      )}

      {/* タイトルプレート（枠＋木の板＋文字） */}
      <mesh position={[0, plateY, plateZ - 0.01]} castShadow>
        <boxGeometry args={[PLATE_W + 0.05, PLATE_H + 0.05, 0.03]} />
        <meshLambertMaterial color={FRAME} />
      </mesh>
      <mesh position={[0, plateY, plateZ]} castShadow>
        <boxGeometry args={[PLATE_W, PLATE_H, 0.02]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <Text
        position={[0, plateY, plateZ + 0.012]}
        fontSize={0.08}
        color={TEXT_COLOR}
        anchorX="center"
        anchorY="middle"
        font={jpFont}
        maxWidth={PLATE_W - 0.08}
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        {plateLabel}
      </Text>

      {/* クリアボタン（赤。作品があるときのみ） */}
      {exhibit && (
        <Interactable
          id="openbrush-clear"
          onInteract={() => clearExhibit()}
          interactionText="作品を削除"
        >
          <mesh position={[0, plateY + 0.2, plateZ]}>
            <boxGeometry args={[0.085, 0.085, 0.03]} />
            <meshStandardMaterial color="#e24a4a" emissive="#7a1414" emissiveIntensity={0.6} />
          </mesh>
        </Interactable>
      )}
    </group>
  )
}
