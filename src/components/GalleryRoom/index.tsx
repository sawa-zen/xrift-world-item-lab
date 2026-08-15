import { Text, useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { useFileInput, useSharedFile, useXRift, Interactable } from '@xrift/world-components'
import { GLTFGoogleTiltBrushMaterialExtension } from 'three-icosa'
import { Box3, Vector3 } from 'three'
import type { Group } from 'three'
import type { GLTF } from 'three-stdlib'
import { useEffect, useRef, useState } from 'react'

// ===== 部屋の寸法 =====
const ROOM_W = 11
const ROOM_D = 8
const WALL_H = 3.6
const WALL_T = 0.3
const DOOR_W = 2.2 // 入り口の幅

// ギャラリーっぽい色
const FLOOR_COLOR = '#3a332b' // 濃い木床
const WALL_COLOR = '#f5f3ee' // ギャラリーホワイト
const FRAME_COLOR = '#4a3b2a' // 木の額縁
const BACKING_COLOR = '#26241f' // パネル下地
const CAPTION_COLOR = '#d8cfb8'

const FRAME_W = 0.9
const FRAME_H = 1.2
const OPENING_W = FRAME_W - 0.14
const BORDER = 0.07
const FRAME_COUNT = 5

interface Exhibit {
  url: string
  name: string
  blobUrl?: string
}

interface FramedSketchProps {
  /** baseUrl 結合済み or blob URL */
  url: string
  rotationY: number
  maxSize?: number
}

/** 額縁の開口部に収まるよう中央合わせで縮小して表示 */
const FramedSketch: React.FC<FramedSketchProps> = ({ url, rotationY, maxSize = OPENING_W }) => {
  const { baseUrl } = useXRift()
  const { scene } = useGLTF(
    url,
    true,
    false,
    (loader) => {
      loader.register(
        (parser) => new GLTFGoogleTiltBrushMaterialExtension(parser, `${baseUrl}brushes/`),
      )
    },
  ) as GLTF

  const groupRef = useRef<Group>(null)

  useEffect(() => {
    const obj = scene
    if (!obj) return
    let raf = 0
    raf = requestAnimationFrame(() => {
      const box = new Box3().setFromObject(obj)
      if (box.isEmpty()) return
      const size = box.getSize(new Vector3())
      const center = box.getCenter(new Vector3())
      const scale = maxSize / Math.max(size.x, size.y, size.z, 0.0001)
      obj.scale.setScalar(scale)
      obj.position.x = -center.x * scale
      obj.position.y = -center.y * scale
      obj.position.z = -center.z * scale
    })
    return () => cancelAnimationFrame(raf)
  }, [scene, maxSize])

  return (
    <group ref={groupRef} rotation={[0, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  )
}

interface FramePlacement {
  position: [number, number, number]
  rotationY: number
}

/** 額縁（枠＋パネル＋キャプション＋作品） */
const GalleryFrame: React.FC<FramePlacement & { exhibit: Exhibit | null; caption: string }> = ({
  position,
  rotationY,
  exhibit,
  caption,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {/* パネル下地 */}
    <mesh position={[0, 0, -0.01]}>
      <planeGeometry args={[FRAME_W, FRAME_H]} />
      <meshLambertMaterial color={BACKING_COLOR} />
    </mesh>
    {/* 額縁（4辺） */}
    <mesh position={[0, FRAME_H / 2 - BORDER / 2, 0]}>
      <boxGeometry args={[FRAME_W, BORDER, 0.08]} />
      <meshLambertMaterial color={FRAME_COLOR} />
    </mesh>
    <mesh position={[0, -FRAME_H / 2 + BORDER / 2, 0]}>
      <boxGeometry args={[FRAME_W, BORDER, 0.08]} />
      <meshLambertMaterial color={FRAME_COLOR} />
    </mesh>
    <mesh position={[FRAME_W / 2 - BORDER / 2, 0, 0]}>
      <boxGeometry args={[BORDER, FRAME_H, 0.08]} />
      <meshLambertMaterial color={FRAME_COLOR} />
    </mesh>
    <mesh position={[-FRAME_W / 2 + BORDER / 2, 0, 0]}>
      <boxGeometry args={[BORDER, FRAME_H, 0.08]} />
      <meshLambertMaterial color={FRAME_COLOR} />
    </mesh>
    {/* 作品 */}
    {exhibit && <FramedSketch url={exhibit.url} rotationY={0} />}
    {/* キャプション */}
    <Text
      position={[0, -FRAME_H / 2 - 0.1, 0.02]}
      fontSize={0.055}
      color={CAPTION_COLOR}
      anchorX="center"
      anchorY="top"
      maxWidth={FRAME_W}
    >
      {caption}
    </Text>
  </group>
)

/** 入り口側に設置するアップロード台（クリックで .glb をアップロード） */
const UploadStation: React.FC<{
  position: [number, number, number]
  rotationY?: number
  progress: number | null
  onUploaded: (e: Exhibit) => void
  onProgress: (p: number | null) => void
}> = ({ position, rotationY = 0, progress, onUploaded, onProgress }) => {
  const { baseUrl } = useXRift()
  const { requestFileInput } = useFileInput()
  const { uploadSharedFile } = useSharedFile()

  const uploadFile = () => {
    requestFileInput({
      id: 'gallery-upload',
      accept: '.glb',
      maxSize: 50 * 1024 * 1024,
      onSelect: async (files) => {
        const file = files[0]
        if (!file) return
        try {
          onProgress(0)
          const result = await uploadSharedFile(file, (p) => onProgress(p))
          if (result.id === 'dummy-id') {
            const blobUrl = URL.createObjectURL(file)
            onUploaded({ url: blobUrl, name: file.name, blobUrl })
          } else {
            onUploaded({ url: result.publicUrl, name: file.name })
          }
        } catch {
          // アップロード失敗は何もしない
        } finally {
          onProgress(null)
        }
      },
      onError: () => onProgress(null),
    })
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* パネル（壁掛け・明るい発光色） */}
      <Interactable id="gallery-upload-btn" onInteract={() => uploadFile()} interactionText="作品をアップロード">
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.9, 1.0, 0.1]} />
          <meshStandardMaterial color="#2c7bd8" emissive="#2c7bd8" emissiveIntensity={0.9} />
        </mesh>
      </Interactable>
      <Text
        position={[0, 1.78, 0.06]}
        fontSize={0.11}
        color="#ffffff"
        fillOpacity={1}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.8}
        font={`${baseUrl}jp-font.woff`}
      >
        アップロード
      </Text>
      <Text
        position={[0, 1.48, 0.06]}
        fontSize={0.06}
        color="#d8f0ff"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.8}
        font={`${baseUrl}jp-font.woff`}
      >
        {progress !== null ? `アップロード中 ${Math.round(progress)}%` : '作品を差し替える'}
      </Text>
    </group>
  )
}

export interface GalleryRoomProps {
  position?: [number, number, number]
}

/**
 * 展示台ではなく「部屋」で作品を見せるギャラリースペース。
 * 入り口側にアップロード台があり、アップロードした作品が
 * 額縁5点に古い順から順番に飾られていく。
 */
export const GalleryRoom: React.FC<GalleryRoomProps> = ({ position = [0, 0, 0] }) => {
  const wallBox = [ROOM_W, WALL_H, WALL_T] as const
  const wallBoxD = [WALL_T, WALL_H, ROOM_D] as const
  const floorY = -0.05

  // アップロードされた作品（新しい順、最大 FRAME_COUNT 件）
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const addExhibit = (e: Exhibit) => {
    setExhibits((prev) => {
      const next = [e, ...prev].slice(0, FRAME_COUNT)
      // 溢れた blob は revoke
      const removed = prev.filter((x) => x.blobUrl && !next.some((n) => n.blobUrl === x.blobUrl))
      removed.forEach((x) => x.blobUrl && URL.revokeObjectURL(x.blobUrl))
      return next
    })
  }

  // 入り口側（-Z）の壁は中央に DOOR_W の開口を空けて左右に分割
  const sideW = (ROOM_W - DOOR_W) / 2
  const leftX = -(ROOM_W + DOOR_W) / 4
  const rightX = (ROOM_W + DOOR_W) / 4

  const frontZ = ROOM_D / 2 - WALL_T / 2 // 向こう側の壁（+Z）

  // 額縁の配置（部屋へ向ける回転）
  const frames: FramePlacement[] = [
    { position: [-3.2, 1.6, frontZ - 0.06], rotationY: Math.PI },
    { position: [0, 1.6, frontZ - 0.06], rotationY: Math.PI },
    { position: [3.2, 1.6, frontZ - 0.06], rotationY: Math.PI },
    { position: [-ROOM_W / 2 + WALL_T / 2 + 0.06, 1.6, -1.6], rotationY: -Math.PI / 2 },
    { position: [ROOM_W / 2 - WALL_T / 2 - 0.06, 1.6, -1.6], rotationY: Math.PI / 2 },
  ]

  return (
    <group position={position}>
      {/* 床 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
          <planeGeometry args={[ROOM_W, ROOM_D]} />
          <meshLambertMaterial color={FLOOR_COLOR} />
        </mesh>
      </RigidBody>

      {/* 天井 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshLambertMaterial color="#efe9dd" />
      </mesh>

      {/* 壁（向こう +Z） */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_H / 2, frontZ]} castShadow receiveShadow>
          <boxGeometry args={wallBox} />
          <meshLambertMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>
      {/* 壁（左右） */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-ROOM_W / 2 + WALL_T / 2, WALL_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={wallBoxD} />
          <meshLambertMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[ROOM_W / 2 - WALL_T / 2, WALL_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={wallBoxD} />
          <meshLambertMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>
      {/* 壁（入口側 -Z）左右に分割 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[leftX, WALL_H / 2, -ROOM_D / 2 + WALL_T / 2]} castShadow receiveShadow>
          <boxGeometry args={[sideW, WALL_H, WALL_T]} />
          <meshLambertMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[rightX, WALL_H / 2, -ROOM_D / 2 + WALL_T / 2]} castShadow receiveShadow>
          <boxGeometry args={[sideW, WALL_H, WALL_T]} />
          <meshLambertMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* 額縁（exhibits を新しい順に飾る） */}
      {frames.map((f, i) => {
        const exhibit = exhibits[i] ?? null
        const caption = exhibit ? exhibit.name : '空き'
        return <GalleryFrame key={i} {...f} exhibit={exhibit} caption={caption} />
      })}

      {/* アップロードパネル（入り口の左手・壁掛け） */}
      <UploadStation
        position={[-3.0, 0, -3.65]}
        rotationY={0}
        progress={uploadProgress}
        onUploaded={addExhibit}
        onProgress={setUploadProgress}
      />
    </group>
  )
}