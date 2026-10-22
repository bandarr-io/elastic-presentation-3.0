import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const BASELINE_FILE = join(SRC, 'utils', 'emDashBaseline.txt')

const EM_DASH = '\u2014'
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx']

// Files that still contain em dashes from before the ban. The list only ever
// shrinks: clean a file, drop its line, and this test keeps it clean. Anything
// not listed must have none, so new files start out right.
const baseline = new Set(
  readFileSync(BASELINE_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
)

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return EXTENSIONS.some((ext) => name.endsWith(ext)) ? [path] : []
  })
}

const files = sourceFiles(SRC).map((path) => relative(SRC, path).split(sep).join('/'))

describe('no em dashes', () => {
  it('finds none outside the baseline', () => {
    const offenders = files
      .filter((file) => !baseline.has(file))
      .filter((file) => readFileSync(join(SRC, file), 'utf8').includes(EM_DASH))
    expect(offenders).toEqual([])
  })

  it('keeps the baseline honest: every listed file exists and still has one', () => {
    const stale = [...baseline].filter(
      (file) => !files.includes(file) || !readFileSync(join(SRC, file), 'utf8').includes(EM_DASH),
    )
    expect(stale).toEqual([])
  })
})
