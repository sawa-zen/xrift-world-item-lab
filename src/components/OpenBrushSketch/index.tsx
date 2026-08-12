import { useGLTF } from '@react-three/drei'
import { useXRift } from '@xrift/world-components'
import { GLTFGoogleTiltBrushMaterialExtension } from 'three-icosa'
import type { GLTF } from 'three-stdlib'

export interface OpenBrushSketchProps {
  /** public/ に配置した Open Brush エクスポート GLB のファイル名 */
  url: string
  position?: [number, number, number]
  scale?: number
  rotation?: [number, number, number]
}

/**
 * Open Brush からエクスポートした GLB を表示するコンポーネント。
 * GLB 内の GOOGLE_tilt_brush_material 拡張を three-icosa の
 * GLTFGoogleTiltBrushMaterialExtension で解釈し、ブラシを正しく描画します。
 */
export const OpenBrushSketch: React.FC<OpenBrushSketchProps> = ({
  url,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
}) => {
  const { baseUrl } = useXRift()
  const brushesPath = `${baseUrl}brushes/`

  const { scene } = useGLTF(
    `${baseUrl}${url}`,
    true,
    false,
    (loader) => {
      loader.register(
        (parser) => new GLTFGoogleTiltBrushMaterialExtension(parser, brushesPath),
      )
    },
  ) as GLTF

  return <primitive object={scene} position={position} scale={scale} rotation={rotation} />
}
