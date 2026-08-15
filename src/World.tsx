import { SpawnPoint } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import { Mesh } from 'three'
import { OpenBrushDisplayStand } from './components/OpenBrushDisplayStand'
import { Skybox } from './components/Skybox'
import { COLORS, WORLD_CONFIG } from './constants'

export interface WorldProps {
  position?: [number, number, number]
  scale?: number
}

export const World: React.FC<WorldProps> = ({ position = [0, 0, 0], scale = 1 }) => {
  const groundRef = useRef<Mesh>(null)
  const worldSize = WORLD_CONFIG.size * scale
  const wallHeight = WORLD_CONFIG.wallHeight * scale
  const wallThickness = WORLD_CONFIG.wallThickness * scale

  return (
    <group position={position} scale={scale}>

      {/* ========== 環境・照明 ========== */}
      <Skybox radius={500} />
      {/* 周囲は暗く、展示物へ当たる温かい光のみ */}
      <ambientLight intensity={0.15} color="#c9c1b8" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.6}
        color="#fff2dc"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[0, 6, -3.5]} intensity={14} distance={18} color="#ffd9a0" />

      {/* ========== 床 ========== */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[worldSize, worldSize]} />
          <meshLambertMaterial color={COLORS.ground} />
        </mesh>
      </RigidBody>

      {/* ========== 壁 ========== */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[worldSize / 2, wallHeight / 2, 0]} castShadow>
          <boxGeometry args={[wallThickness, wallHeight, worldSize]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[-worldSize / 2, wallHeight / 2, 0]} castShadow>
          <boxGeometry args={[wallThickness, wallHeight, worldSize]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[0, wallHeight / 2, worldSize / 2]} castShadow>
          <boxGeometry args={[worldSize, wallHeight, wallThickness]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[0, wallHeight / 2, -worldSize / 2]} castShadow>
          <boxGeometry args={[worldSize, wallHeight, wallThickness]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>

      {/* ========== スポーン地点 ========== */}
      <SpawnPoint />

      {/* ========== Open Brush 展示台 ========== */}
      {/* サンプル作品を載せた展示台（従来と同じ medium サイズ） */}
      <OpenBrushDisplayStand
        id="stand-sample"
        position={[0, 0, -3.5]}
        size="medium"
        sampleFile="openbrush-sketch.glb"
        sampleName="サンプル作品"
      />
      {/* 小・中・大の空き展示台。高さは共通で、広さだけが変わる */}
      {/* 台同士の間に 1.3m 以上の通路が空くよう、天面スラブの幅を見て配置している */}
      <OpenBrushDisplayStand id="stand-small" position={[3, 0, -3.5]} size="small" />
      <OpenBrushDisplayStand id="stand-medium" position={[6, 0, -3.5]} size="medium" />
      <OpenBrushDisplayStand id="stand-large" position={[10, 0, -3.5]} size="large" />
    </group>
  )
}
