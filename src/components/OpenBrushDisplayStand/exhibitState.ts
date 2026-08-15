/**
 * 展示台に載っている作品の状態。
 * World Storage（永続）と instance state（ライブ同期）の両方でこの形を共有する。
 */
export interface ExhibitState {
  /** 表示に使う GLB の URL */
  publicUrl: string
  /** 共有ファイルの ID。差し替え・削除時に実体を消すのに使う（dev のダミー時は無し） */
  fileId?: string
  /** プレートに出す名前 */
  title: string
  uploaderId?: string
  uploaderName?: string
  createdAt?: string
}

/**
 * 「空にした」ことを表す永続値。
 * キーごと削除してしまうとサンプル作品が復活してしまうため、墓標として保存する。
 */
export interface DeletedMarker {
  deleted: true
}

export type StoredExhibit = ExhibitState | DeletedMarker

export const isDeletedMarker = (value: unknown): value is DeletedMarker =>
  typeof value === 'object' && value !== null && (value as DeletedMarker).deleted === true

export const isExhibitState = (value: unknown): value is ExhibitState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ExhibitState).publicUrl === 'string'

/** World Storage / instance state の共有キー（形式 [A-Za-z0-9_.\-:] に適合させる） */
export const exhibitKey = (standId: string) => `exhibit-${standId}`

/**
 * baseUrl からワールド作者のユーザー ID を取り出す。
 * 例: https://assets.xrift.net/users/{ownerId}/worlds/{worldId}/{hash}/
 */
export const worldOwnerIdFromBaseUrl = (baseUrl: string): string | null =>
  baseUrl.match(/\/users\/([^/]+)\/worlds\//)?.[1] ?? null
