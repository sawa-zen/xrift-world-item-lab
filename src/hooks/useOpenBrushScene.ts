import { useGLTF } from '@react-three/drei'
import { useXRift } from '@xrift/world-components'
import { GLTFGoogleTiltBrushMaterialExtension } from 'three-icosa'
import { useMemo } from 'react'
import type { Group, Object3D } from 'three'
import type { GLTF } from 'three-stdlib'

/**
 * onBeforeRender / onAfterRender を元のツリーから複製後のツリーへ移し替える。
 *
 * three の Object3D.copy() はこの 2 つを引き継がない。
 * three-icosa は onBeforeRender で u_time（ブラシのアニメーション）や
 * cameraPosition・ライト・フォグの uniform を毎フレーム更新しているため、
 * 移し替えないと clone した作品のエフェクトが止まったまま表示される。
 */
const copyRenderHooks = (source: Object3D, target: Object3D) => {
  target.onBeforeRender = source.onBeforeRender
  target.onAfterRender = source.onAfterRender
  const count = Math.min(source.children.length, target.children.length)
  for (let i = 0; i < count; i++) copyRenderHooks(source.children[i], target.children[i])
}

/**
 * Open Brush からエクスポートした GLB を読み込み、そのまま配置できる scene を返す。
 * GLB 内の GOOGLE_tilt_brush_material 拡張（および `ob-` 命名の新形式）は
 * three-icosa の GLTFGoogleTiltBrushMaterialExtension が解釈する。
 *
 * useGLTF は同じ URL に対して同一の scene インスタンスを返す。
 * それを複数箇所の <primitive> に渡すと three.js の仕様上「最後に追加した 1 箇所」にしか
 * 表示されず、さらにフィット処理で transform を書き換えると他の表示まで動いてしまう。
 * そのため呼び出しごとに clone を返す（ジオメトリとマテリアルは共有されるので安価）。
 */
export const useOpenBrushScene = (url: string): Group => {
  const { baseUrl } = useXRift()
  const brushesPath = `${baseUrl}brushes/`

  const { scene } = useGLTF(url, true, false, (loader) => {
    loader.register(
      (parser) => new GLTFGoogleTiltBrushMaterialExtension(parser, brushesPath),
    )
  }) as GLTF

  return useMemo(() => {
    const copy = scene.clone()
    copyRenderHooks(scene, copy)
    return copy
  }, [scene])
}
