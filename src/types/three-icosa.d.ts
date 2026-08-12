declare module 'three-icosa' {
  import * as THREE from 'three'

  export type TiltMaterialFactory = (
    materialParams: THREE.ShaderMaterialParameters,
    brushName: string,
  ) => THREE.Material

  export interface TiltTextureContext {
    brushName: string
    uniformName: string
    isFallback: boolean
  }

  export type TiltTextureConfigurator = (
    texture: THREE.Texture,
    context: TiltTextureContext,
  ) => void

  export interface TiltShaderLoaderOptions {
    materialFactory?: TiltMaterialFactory
    textureConfigurator?: TiltTextureConfigurator
  }

  export class TiltShaderLoader extends THREE.Loader<any, string> {
    constructor(manager?: THREE.LoadingManager, options?: TiltShaderLoaderOptions)
    materialFactory: TiltMaterialFactory
    textureConfigurator?: TiltTextureConfigurator
    loadedMaterials: Record<string, THREE.Material>
    createMaterial(
      materialParams: THREE.ShaderMaterialParameters,
      brushName: string,
    ): THREE.Material
    configureTexture(
      texture: THREE.Texture,
      brushName: string,
      uniformName: string,
      isFallback?: boolean,
    ): THREE.Texture
    load(brushName: any, onLoad: any, onProgress: any, onError: any): Promise<void>
    parse(rawMaterial: any): any
    lookupMaterialParams(materialName: string): THREE.ShaderMaterialParameters | null
    lookupMaterialName(nameOrGuid: any): string | undefined
  }

  export const TUBE_TOON_INVERTED_BRUSH_GUID: string
  export const TUBE_TOON_INVERTED_OUTLINE_SIZE: number
  export const TOON_BRUSH_GUID: string
  export const ELECTRICITY_BRUSH_GUID: string
  export const ELECTRICITY_DISPLACEMENT_MODS: readonly number[]

  export function createTiltBrushRenderMaterial(
    brushNameOrGuid: string,
    source: THREE.Material,
    sharedUniforms?: Record<string, { value: unknown }>,
  ): THREE.Material | THREE.ShaderMaterial[]

  export function applyTiltBrushRenderGroups(
    geometry: THREE.BufferGeometry,
    indexCount: number,
    material: THREE.Material | THREE.Material[],
  ): void

  export class GLTFGoogleTiltBrushMaterialExtension {
    constructor(parser: any, brushPath: string, isLegacy?: boolean)
    name: string
    parser: any
    brushPath: any
    isLegacy: boolean
    tiltShaderLoader: TiltShaderLoader
    clock: THREE.Clock
    beforeRoot(): Promise<void> | null
    afterRoot(glTF: any): Promise<void> | null
    replaceMaterial(mesh: any, guid: any): Promise<void>
  }

  export class GLTFGoogleTiltBrushTechniquesExtension {
    constructor(parser: any, brushPath: string, isLegacy?: boolean)
    name: string
    parser: any
    brushPath: any
    isLegacy: boolean
    tiltShaderLoader: TiltShaderLoader
    clock: THREE.Clock
    beforeRoot(): Promise<void> | null
    afterRoot(glTF: any): Promise<void> | null
    replaceMaterial(mesh: any, guid: any): Promise<void>
  }
}
