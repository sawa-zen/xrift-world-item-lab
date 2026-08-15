import { useTexture } from '@react-three/drei'
import { BackSide } from 'three'
import { useXRift } from '@xrift/world-components'

export interface SkyboxProps {
  /** skyboxのサイズ（半径） */
  radius?: number
}

/**
 * Skyboxコンポーネント
 * public/tokyo-station.jpg を360度パノラマ背景として表示します
 * 博物館の夜のような暗い雰囲気にするため、半透明の暗色球を重ねています。
 */
export const Skybox: React.FC<SkyboxProps> = ({ radius = 500 }) => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}tokyo-station.jpg`)

  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, 60, 40]} />
        <meshBasicMaterial map={texture} side={BackSide} fog={false} />
      </mesh>
      {/* 暗色のオーバーレイ球（空を暗くして夜の雰囲気に） */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[radius + 1, 60, 40]} />
        <meshBasicMaterial
          color="#0a0f1a"
          transparent
          opacity={0.72}
          side={BackSide}
          fog={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
