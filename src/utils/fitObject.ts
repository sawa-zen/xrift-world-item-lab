import { Box3, Matrix4, Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'

const _relative = new Matrix4()
const _inverse = new Matrix4()
const _childBox = new Box3()

/**
 * object のローカル空間での AABB を返す。
 *
 * Box3.setFromObject() はワールド空間の AABB を返すため、親（展示台・部屋など）の
 * position/rotation や object 自身の scale がそのまま混ざってしまう。
 * ここでは object 自身の matrixWorld の逆行列を掛けることで、
 * 「親の配置にも自分の transform にも依存しない素の大きさ」を得る。
 * そのため何度呼んでも同じ結果になる（＝フィット処理を冪等にできる）。
 */
export const getLocalBounds = (object: Object3D): Box3 => {
  const box = new Box3().makeEmpty()
  // 子孫の matrixWorld を最新化（親側は触らない）
  object.updateWorldMatrix(false, true)
  _inverse.copy(object.matrixWorld).invert()

  object.traverse((child) => {
    const geometry = (child as Partial<Mesh>).geometry
    if (!geometry) return
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    if (!geometry.boundingBox) return
    _relative.multiplyMatrices(_inverse, child.matrixWorld)
    _childBox.copy(geometry.boundingBox).applyMatrix4(_relative)
    box.union(_childBox)
  })

  return box
}

/** 底面を原点に合わせる（展示台の上に載せる）か、重心を原点に合わせる（額縁の中央）か */
export type FitAnchor = 'bottom' | 'center'

/**
 * object を maxSize の立方体に収まるよう等倍縮小し、親の原点に合わせて配置する。
 *
 * object 自身の現在の scale/position に依存しないので、何度実行しても結果は変わらない。
 * 収まる形状が無い（ジオメトリが空）場合は false を返す。
 */
export const fitObject = (
  object: Object3D,
  maxSize: number,
  anchor: FitAnchor = 'bottom',
): boolean => {
  const box = getLocalBounds(object)
  if (box.isEmpty()) return false

  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const largest = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(largest) || largest <= 0) return false

  const scale = maxSize / largest
  object.scale.setScalar(scale)
  object.position.set(
    -center.x * scale,
    (anchor === 'bottom' ? -box.min.y : -center.y) * scale,
    -center.z * scale,
  )
  return true
}
