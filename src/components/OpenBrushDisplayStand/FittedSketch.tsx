import { useEffect, useRef } from 'react'
import { useOpenBrushScene } from '../../hooks/useOpenBrushScene'
import { fitObject } from '../../utils/fitObject'

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
 * 水平方向は中心、垂直方向は底面を原点（＝台座の天面）に揃える。
 */
export const FittedSketch: React.FC<FittedSketchProps> = ({
  url,
  maxSize = 1.5,
  position = [0, 0, 0],
  onLoaded,
}) => {
  const scene = useOpenBrushScene(url)

  // onLoaded は毎レンダー新しい関数が渡されうるので、effect の依存には含めない
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded

  useEffect(() => {
    if (fitObject(scene, maxSize, 'bottom')) onLoadedRef.current?.()
  }, [scene, maxSize])

  return (
    <group position={position}>
      <primitive object={scene} />
    </group>
  )
}
