/** Legge un corpo JSON in modo tipizzato, restituendo un oggetto vuoto se non e valido. */
export async function readJson<T>(source: Request | Response): Promise<Partial<T>> {
  try {
    return ((await source.json()) as T) ?? {}
  } catch {
    return {}
  }
}

export type ApiError = { error?: string }
