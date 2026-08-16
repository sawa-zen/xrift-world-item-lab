export const WORLD_CONFIG = {
  size: 40,
  wallHeight: 5,
  wallThickness: 0.5,
} as const

// 環境光が 0.15 と弱いため、実際の見え方は指定色よりかなり暗く沈む。
// 「少し暗めのグレー」に見せるには、指定値は一段明るめに置いておく。
export const COLORS = {
  ground: '#585c62', // 少し暗めのグレー（床）
  wall: '#6a6e76', // 床よりわずかに明るいグレー（壁）
  // スカイボックスは meshBasicMaterial（＝ライティングを受けない）ので、
  // 指定した hex がそのまま画面に出る。一方で壁は環境光 0.15 しか当たらない面が多く、
  // #6a6e76 でも実際には #25 前後まで沈む。その見え方に合わせた値。
  sky: '#26282c',
} as const
