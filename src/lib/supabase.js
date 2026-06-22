import { createClient } from '@supabase/supabase-js'

const clientCache = new Map()

export function createSupabaseClient(url, anonKey, options = {}) {
  if (!url || !anonKey) {
    return null
  }

  // Use a different cache key if persistSession is true so admin client doesn't conflict with widget client
  const isPersisted = options.auth?.persistSession ?? false
  const cacheKey = `${url}|${anonKey}|${isPersisted}`
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...options.auth,
    },
  })
  clientCache.set(cacheKey, client)
  return client
}