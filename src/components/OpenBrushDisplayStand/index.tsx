import { Text } from '@react-three/drei'
import {
  Interactable,
  useFileInput,
  useInstanceState,
  useSharedFile,
  useUsers,
  useWorldStorage,
  useXRift,
} from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'
import { Component } from 'react'
import type { ReactNode } from 'react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { FittedSketch } from './FittedSketch'
import {
  exhibitKey,
  isDeletedMarker,
  isExhibitState,
  worldOwnerIdFromBaseUrl,
  type ExhibitState,
  type StoredExhibit,
} from './exhibitState'

// ===== 3dgs ミュージアム島の展示台（Gallery/Pedestal）と同じ寸法・材質 =====
// 高さ方向（BASE_H / SLAB_H / MAT_H）は全サイズ共通。広さだけを size で切り替える。
const BASE_H = 0.6
const SLAB_H = 0.08
const MAT_H = 0.01
const PLATE_TOP_GAP = BASE_H - 0.35

/** 展示台の広さ。高さは変わらない */
export type StandSize = 'small' | 'medium' | 'large'

/** size ごとの台座（base）と天面スラブ（slab）の一辺 */
const STAND_FOOTPRINT: Record<StandSize, { base: number; slab: number }> = {
  small: { base: 1.2, slab: 1.4 },
  medium: { base: 1.8, slab: 2.0 },
  large: { base: 2.8, slab: 3.0 },
}

// タイトルプレートは台の広さに関わらず固定サイズ。
// 貼り付く台座の正面は高さ 0.6 で全サイズ共通なので、広さに合わせて拡大すると
// 縦にはみ出したり、クリアボタンが天面スラブに埋まったりする。
const PLATE_W = 0.72
const PLATE_H = 0.26
const PLATE_FONT = 0.08
/** クリアボタンのプレート中心からの高さ（天面スラブ 0.6〜0.68 に被らない位置） */
const CLEAR_BUTTON_OFFSET = 0.2
const CLEAR_BUTTON_SIZE = 0.085

// 素材は museum.glb に依存せず、展示台のフォールバック色をそのまま使う
const CONCRETE = '#dcdce0' // コンクリ台座（PlazaInner）
const WOOD = '#8a6a45' // 正面プレート（WoodDeck）
const FRAME = '#2b2b33' // プレート枠（Stage）
const FELT = '#8e1c1c' // 天面の赤フェルトマット
const TEXT_COLOR = '#ffffff'

/** 台座天面（マット上面）の高さ。作品はここに載せる。全サイズ共通 */
const TOP_Y = BASE_H + SLAB_H + MAT_H
/** 作品の最大サイズは天面スラブの広さに比例させる */
const ART_SIZE_RATIO = 1.2
const MAX_NAME_LEN = 12
/** 一時メッセージ（進捗・エラー）をプレートに出しておく時間 */
const MESSAGE_DURATION = 3000

const truncate = (s: string, n = MAX_NAME_LEN) => (s.length > n ? `${s.slice(0, n)}…` : s)

interface OpenBrushDisplayStandProps {
  /**
   * 台ごとに一意な ID。インタラクション・ファイル入力・保存キーの識別に使うため、
   * 同じワールドに複数置くときは必ず別の値にすること。
   */
  id: string
  position?: [number, number, number]
  /** 台の広さ（高さは共通） */
  size?: StandSize
  /** 何も保存されていないときに表示する作品。public/ 配下のファイル名を渡す */
  sampleFile?: string
  /** サンプル作品の名前（プレートに出る） */
  sampleName?: string
}

/** GLB 読み込み失敗時に表示を諦める ErrorBoundary */
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
  id,
  position = [0, 0, 0],
  size = 'medium',
  sampleFile,
  sampleName = 'サンプル作品',
}) => {
  const { baseUrl } = useXRift()
  const { requestFileInput } = useFileInput()
  const { uploadSharedFile, setSharedFileLock, deleteSharedFile } = useSharedFile()
  const { localUser } = useUsers()
  const storage = useWorldStorage()

  // 広さ関連の寸法（高さは全サイズ共通）
  const { base: baseSize, slab: slabSize } = STAND_FOOTPRINT[size]
  const maxArtSize = slabSize * ART_SIZE_RATIO

  const key = exhibitKey(id)

  // ライブ同期。同じインスタンスにいる全員へ即時反映される（揮発性）
  const [live, setLive] = useInstanceState<StoredExhibit | null>(key, null)
  // 永続復元。undefined = World Storage 読み込み中
  const [restored, setRestored] = useState<StoredExhibit | null | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    storage.shared
      .get(key)
      .then((value) => {
        if (cancelled) return
        setRestored(isExhibitState(value) || isDeletedMarker(value) ? value : null)
      })
      .catch((e) => {
        console.error('[DisplayStand] world storage get failed', e)
        if (!cancelled) setRestored(null)
      })
    return () => {
      cancelled = true
    }
  }, [storage, key])

  // dev のダミー実装用に自前で作った blob URL。差し替え時・破棄時に revoke する
  const ownBlobUrlRef = useRef<string | null>(null)
  const replaceOwnBlobUrl = (url: string | null) => {
    if (ownBlobUrlRef.current && ownBlobUrlRef.current !== url) {
      URL.revokeObjectURL(ownBlobUrlRef.current)
    }
    ownBlobUrlRef.current = url
  }
  useEffect(
    () => () => {
      if (ownBlobUrlRef.current) URL.revokeObjectURL(ownBlobUrlRef.current)
    },
    [],
  )

  // 表示の優先順位: ライブ同期 > 永続復元 > サンプル作品
  const current = live ?? restored ?? null
  const shown: ExhibitState | null = isExhibitState(current)
    ? current
    : isDeletedMarker(current) || restored === undefined
      ? null // 「空にした」か、まだ復元待ち
      : sampleFile
        ? { publicUrl: `${baseUrl}${sampleFile}`, title: sampleName }
        : null

  // 差し替え・削除ができるのは、アップロードした本人かワールド作者のみ。
  // 空き台と（誰のものでもない）サンプル作品は誰でも差し替えてよい。
  const ownerId = worldOwnerIdFromBaseUrl(baseUrl)
  const canEdit =
    !!localUser &&
    !localUser.isGuest &&
    (!shown?.uploaderId ||
      localUser.id === shown.uploaderId ||
      (!!ownerId && localUser.id === ownerId))

  // 別の作品に切り替わったら読み込み失敗フラグを戻す（他ユーザーの更新でも切り替わる）
  useEffect(() => {
    setFailed(false)
  }, [shown?.publicUrl])

  const showMessage = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), MESSAGE_DURATION)
  }

  /** ライブ同期と永続化をまとめて行う */
  const persist = async (value: StoredExhibit) => {
    setLive(value)
    try {
      await storage.shared.set(key, value)
    } catch (e) {
      console.error('[DisplayStand] world storage set failed', e)
      showMessage('保存に失敗しました')
    }
  }

  /** 共有ファイルの実体を削除（ロック中は先に解除） */
  const removeSharedFile = async (fileId: string) => {
    try {
      await setSharedFileLock(fileId, false)
      await deleteSharedFile(fileId)
    } catch (e) {
      console.error('[DisplayStand] shared file delete failed', e)
    }
  }

  const uploadFile = () => {
    if (!localUser || localUser.isGuest) {
      showMessage('アップロードにはログインが必要です')
      return
    }
    if (!canEdit) {
      showMessage('他の人がアップロードした作品です')
      return
    }
    // 差し替え時に消す旧ファイル（アップロード成功後に削除する）
    const previousFileId = shown?.fileId

    requestFileInput({
      id: `${id}-upload`,
      accept: '.glb',
      // maxSize は指定しない（ワールド側でサイズ制限をかけない）。
      // プラットフォーム側の上限に当たった場合は onError / アップロード失敗で拾う
      onSelect: async (files) => {
        const file = files[0]
        if (!file) return
        try {
          setMessage('アップロード中 0%')
          // 共有ファイル一覧での識別性のため、用途がわかるファイル名にして保存する
          const storedName = `openbrush-${id}-${Date.now()}.glb`
          const typed = new File([file], storedName, { type: 'model/gltf-binary' })
          const info = await uploadSharedFile(
            typed,
            (p) => setMessage(`アップロード中 ${Math.round(p)}%`),
            {
              description: `Open Brush 展示 (${id})`,
              metadata: {
                purpose: 'openbrush-exhibit',
                stand: id,
                uploaderId: localUser.id,
              },
            },
          )

          // 開発環境のデフォルト実装はダミー ID/URL を返すのでローカル blob で表示する
          const isDummy = info.id === 'dummy-id'
          const publicUrl = isDummy ? URL.createObjectURL(file) : info.publicUrl
          if (isDummy) replaceOwnBlobUrl(publicUrl)

          if (!isDummy) {
            // 誤削除防止のため実体をロック（失敗しても致命ではないのでログのみ）
            try {
              await setSharedFileLock(info.id, true)
            } catch (e) {
              console.error('[DisplayStand] setSharedFileLock failed', e)
            }
          }

          await persist({
            publicUrl,
            fileId: isDummy ? undefined : info.id,
            title: file.name,
            uploaderId: localUser.id,
            uploaderName: localUser.displayName,
            createdAt: info.createdAt,
          })

          // 差し替えの場合、旧ファイル実体を削除（孤立防止）
          if (previousFileId && previousFileId !== info.id) {
            await removeSharedFile(previousFileId)
          }
          setMessage(null)
        } catch (e) {
          console.error('[DisplayStand] upload failed', e)
          showMessage('アップロードに失敗しました')
        }
      },
      onError: (error) => {
        showMessage(
          error.type === 'file_too_large'
            ? 'ファイルが大きすぎます'
            : '.glb ファイルを選んでください',
        )
      },
      onCancel: () => setMessage(null),
    })
  }

  const clearExhibit = async () => {
    if (!canEdit) {
      showMessage('他の人がアップロードした作品です')
      return
    }
    const fileId = shown?.fileId
    replaceOwnBlobUrl(null)
    // キーごと消すとサンプル作品が復活してしまうので、墓標を保存して「空」を永続化する
    await persist({ deleted: true })
    if (fileId) await removeSharedFile(fileId)
  }

  // プレートの文字列（一時メッセージ > 読み込み失敗 > 作品名 > 空き台）
  const plateLabel =
    message ??
    (failed ? '読み込めませんでした' : shown ? truncate(shown.title) : '空き展示台')

  // プレートの向き（ローカル +Z 面＝スポーン側を向く）
  const plateY = BASE_H - PLATE_TOP_GAP // = 0.35
  const plateZ = baseSize / 2 + 0.011

  return (
    <group position={position}>
      {/* 台座本体（直方体・貫通防止コライダー付き）。クリックでアップロード */}
      <RigidBody type="fixed" colliders="cuboid">
        <Interactable
          id={`${id}-upload`}
          onInteract={() => uploadFile()}
          interactionText={shown ? '作品を差し替える' : '作品をアップロード'}
        >
          {/* receiveShadow は付けない。天面スラブが台座より 0.2 広いため、
              その庇の影が低解像度のシャドウマップで汚く落ちてしまう */}
          <mesh position={[0, BASE_H / 2, 0]} castShadow>
            <boxGeometry args={[baseSize, BASE_H, baseSize]} />
            <meshLambertMaterial color={CONCRETE} />
          </mesh>
        </Interactable>
      </RigidBody>

      {/* 天面スラブ */}
      <mesh position={[0, BASE_H + SLAB_H / 2, 0]} castShadow>
        <boxGeometry args={[slabSize, SLAB_H, slabSize]} />
        <meshLambertMaterial color={CONCRETE} />
      </mesh>

      {/* 赤フェルトのマット（天面スラブの上）。
          スラブとの間隔が 0.01 しかなく、receiveShadow を付けるとスラブ自身の影が
          シャドウアクネとして乗るため受けない */}
      <mesh position={[0, BASE_H + SLAB_H + MAT_H / 2, 0]} castShadow>
        <boxGeometry args={[slabSize, MAT_H, slabSize]} />
        <meshStandardMaterial color={FELT} roughness={0.95} metalness={0} />
      </mesh>

      {/* 展示スケッチ（マット上面に載せる） */}
      {shown && !failed && (
        <SketchErrorBoundary key={shown.publicUrl} onError={() => setFailed(true)}>
          {/* GLB の読み込み中にワールド全体が suspend しないよう、ここで受け止める */}
          <Suspense fallback={null}>
            <FittedSketch
              url={shown.publicUrl}
              position={[0, TOP_Y, 0]}
              maxSize={maxArtSize}
            />
          </Suspense>
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
        fontSize={PLATE_FONT}
        color={TEXT_COLOR}
        anchorX="center"
        anchorY="middle"
        font={`${baseUrl}jp-font.woff`}
        maxWidth={PLATE_W - 0.08}
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        {plateLabel}
      </Text>

      {/* クリアボタン（赤。作品があるときのみ） */}
      {shown && (
        <Interactable
          id={`${id}-clear`}
          onInteract={() => clearExhibit()}
          interactionText="作品を削除"
        >
          <mesh position={[0, plateY + CLEAR_BUTTON_OFFSET, plateZ]}>
            <boxGeometry args={[CLEAR_BUTTON_SIZE, CLEAR_BUTTON_SIZE, 0.03]} />
            <meshStandardMaterial color="#e24a4a" emissive="#7a1414" emissiveIntensity={0.6} />
          </mesh>
        </Interactable>
      )}
    </group>
  )
}
