// Typed re-export of the vendored mp4-muxer build (see LICENSE.txt).
// @ts-expect-error — the .mjs build has no types of its own; mp4-muxer.d.ts beside it is the source of truth.
import * as impl from './mp4-muxer.mjs'
import type * as T from './mp4-muxer'

export const Muxer = (impl as unknown as { Muxer: typeof T.Muxer }).Muxer
export const ArrayBufferTarget = (impl as unknown as { ArrayBufferTarget: typeof T.ArrayBufferTarget }).ArrayBufferTarget
export type { Muxer as MuxerType, ArrayBufferTarget as ArrayBufferTargetType } from './mp4-muxer'
