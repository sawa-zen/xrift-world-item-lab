import { BackSide } from 'three'
import { COLORS } from '../../constants'

export interface SkyboxProps {
  /** skyboxのサイズ（半径） */
  radius?: number
}

/**
 * Skyboxコンポーネント
 * 壁や床と同系のグレーで塗りつぶし、展示物から目を逸らす背景を作らない。
 */
export const Skybox: React.FC<SkyboxProps> = ({ radius = 500 }) => (
  <mesh>
    <sphereGeometry args={[radius, 32, 16]} />
    <meshBasicMaterial color={COLORS.sky} side={BackSide} fog={false} />
  </mesh>
)
