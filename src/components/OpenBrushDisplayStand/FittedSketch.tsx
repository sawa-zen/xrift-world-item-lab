import { useGLTF } from '@react-three/drei'
import { useXRift } from '@xrift/world-components'
import { GLTFGoogleTiltBrushMaterialExtension } from 'three-icosa'
import { Box3, Vector3 } from 'three'
import type { Group } from 'three'
import { useEffect, useRef } from 'react'
import type { GLTF } from 'three-stdlib'

export interface FittedSketchProps {
  /** GLB の URL（baseUrl 結合済み or blob URL） */
  url: string
  /** 表示スペースに収まるようスケーリングする際の最大サイズ */
  maxSize?: number
  position?: [number, number, number]
  /** 配置（リサイズ）が完了したときに呼ばれる */
  onLoaded?: () => void
}

/**
 * Open Brush エクスポート GLB を台座の上に収まるよう自動フィットして表示する。
 * GOOGLE_tilt_brush_material 拡張は three-icosa で解釈する。
 * 水平方向は中心、垂直方向は底辺を y=0 に揃える。
 */
export const FittedSketch: React.FC<FittedSketchProps> = ({
  url,
  maxSize = 1.5,
  position = [0, 0, 0],
  onLoaded,
}) => {
  const { baseUrl } = useXRift()
  const brushesPath = `${baseUrl}brushes/`

  const { scene } = useGLTF(
    url,
    true,
    false,
    (loader) => {
      loader.register(
        (parser) => new GLTFGoogleTiltBrushMaterialExtension(parser, brushesPath),
      )
    },
  ) as GLTF

  const groupRef = useRef<Group>(null)

  useEffect(() => {
    const sceneObj = scene
    if (!sceneObj) return
    let raf = 0
    raf = requestAnimationFrame(() => {
      const box = new Box3().setFromObject(sceneObj)
      if (box.isEmpty()) return
      const size = box.getSize(new Vector3())
      const center = box.getCenter(new Vector3())
      const scale = maxSize / Math.max(size.x, size.y, size.z, 0.0001)
      sceneObj.scale.setScalar(scale)
      sceneObj.position.x = -center.x * scale
      sceneObj.position.z = -center.z * scale
      sceneObj.position.y = -box.min.y * scale
      onLoaded?.()
    })
    return () => cancelAnimationFrame(raf)
  }, [scene, maxSize, onLoaded])

  return (
    <group position={position} ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}
