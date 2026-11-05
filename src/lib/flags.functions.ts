import { createServerFn } from '@tanstack/react-start'
import { readFlags, type Flags } from './flags'

/** The page asks once; the answer is cached by the router loader. */
export const getFlags = createServerFn({ method: 'GET' }).handler(async (): Promise<Flags> => readFlags())
