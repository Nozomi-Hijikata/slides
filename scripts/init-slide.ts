#!/usr/bin/env bun
import { $ } from 'bun'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dir, '..')
const SLIDES_DIR = path.join(ROOT_DIR, 'slides')

const input = process.argv[2]
if (!input) {
  console.error('Usage: bun run init:slide <slide-name>')
  process.exit(1)
}

// folder name and package.json `name` must match so that
// `bun --filter='./slides/<dir>'` resolves (oven-sh/bun#18241)
const slideName = input.toLowerCase()
const slideDir = path.join(SLIDES_DIR, slideName)
const slidePath = `slides/${slideName}`

if (await fs.stat(slideDir).then(() => true, () => false)) {
  console.error(`Error: Directory '${slidePath}' already exists`)
  process.exit(1)
}

console.log(`Creating slide: ${slidePath}`)

await fs.mkdir(SLIDES_DIR, { recursive: true })
await $`cp -r ${path.join(ROOT_DIR, '_template')} ${slideDir}`

const slidePkgPath = path.join(slideDir, 'package.json')
const slidePkg = await Bun.file(slidePkgPath).json()
slidePkg.name = slideName
await Bun.write(slidePkgPath, JSON.stringify(slidePkg, null, 2) + '\n')

// workspaces is a glob (slides/*), no manual array update needed.

console.log(`\nCreated: ${slidePath}\n`)
console.log('Next steps:')
console.log('  1. bun install')
console.log(`  2. cd ${slidePath} && bun run dev`)
