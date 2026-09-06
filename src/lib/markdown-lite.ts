import { createElement, Fragment, type ReactNode } from 'react'

/**
 * Il minimo di markdown che serve a leggere IDEE.md: paragrafi, elenchi
 * puntati e grassetto. Produce nodi React, non HTML, cosi' niente passa da
 * dangerouslySetInnerHTML: il testo lo scrive chi modera, ma e' comunque
 * testo scritto da qualcuno. Tutto quello che non riconosce resta com'e'.
 */
export function renderMarkdownLite(source: string): ReactNode {
  const blocks = source.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)
  return createElement(
    Fragment,
    null,
    ...blocks.map((block, index) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return createElement(
          'ul',
          { key: index },
          ...lines.map((line, i) => createElement('li', { key: i }, ...inline(line.replace(/^[-*]\s+/, '')))),
        )
      }
      // Dentro un paragrafo gli a capo sono solo del file: si legge di seguito.
      return createElement('p', { key: index }, ...inline(lines.join(' ')))
    }),
  )
}

/** **grassetto** e `codice`; il resto e' testo. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return createElement('strong', { key: i }, part.slice(2, -2))
    if (part.startsWith('`') && part.endsWith('`')) return createElement('code', { key: i }, part.slice(1, -1))
    return part
  })
}
