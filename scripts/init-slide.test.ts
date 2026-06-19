import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { $ } from 'bun'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

// The script computes ROOT_DIR as `<scriptDir>/..`. We mirror the real layout
// inside a tmp dir and copy the script there, so each test gets an isolated
// "repo root" without touching the actual slides/ folder.

const REAL_SCRIPT = path.resolve(import.meta.dir, 'init-slide.ts')

async function setupTmpRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'init-slide-test-'))

  await Bun.write(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'tmp-repo',
        private: true,
        workspaces: ['shared', 'slides/*'],
      },
      null,
      2,
    ) + '\n',
  )

  await fs.mkdir(path.join(dir, '_template'), { recursive: true })
  await Bun.write(
    path.join(dir, '_template/package.json'),
    JSON.stringify(
      {
        name: 'SLIDE_NAME',
        type: 'module',
        private: true,
        scripts: { dev: 'slidev --open' },
      },
      null,
      2,
    ) + '\n',
  )
  await Bun.write(path.join(dir, '_template/slides.md'), '# title\n')

  await fs.mkdir(path.join(dir, 'scripts'), { recursive: true })
  await fs.copyFile(REAL_SCRIPT, path.join(dir, 'scripts/init-slide.ts'))

  return dir
}

async function runScript(repo: string, ...args: string[]) {
  const proc = Bun.spawn(
    ['bun', path.join(repo, 'scripts/init-slide.ts'), ...args],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const exitCode = await proc.exited
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  return { exitCode, stdout, stderr }
}

describe('init-slide', () => {
  let repo: string

  beforeEach(async () => {
    repo = await setupTmpRepo()
  })

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true })
  })

  test('creates slides/<name> with the template contents', async () => {
    const { exitCode, stdout } = await runScript(repo, 'foo-bar')

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Creating slide: slides/foo-bar')
    expect(stdout).toContain('cd slides/foo-bar && bun run dev')

    const slideDir = path.join(repo, 'slides/foo-bar')
    expect((await fs.stat(slideDir)).isDirectory()).toBe(true)
    expect(await Bun.file(path.join(slideDir, 'slides.md')).text()).toBe('# title\n')
  })

  test('sets the slide package.json name to the slide name', async () => {
    await runScript(repo, 'foo-bar')

    const pkg = await Bun.file(path.join(repo, 'slides/foo-bar/package.json')).json()
    expect(pkg.name).toBe('foo-bar')
    expect(pkg.scripts.dev).toBe('slidev --open')
  })

  test('lowercases the input so the folder basename matches the package name', async () => {
    const { exitCode } = await runScript(repo, 'FooBar')

    expect(exitCode).toBe(0)
    expect((await fs.stat(path.join(repo, 'slides/foobar'))).isDirectory()).toBe(true)
    const pkg = await Bun.file(path.join(repo, 'slides/foobar/package.json')).json()
    expect(pkg.name).toBe('foobar')
  })

  test('leaves the root package.json workspaces untouched (handled by the glob)', async () => {
    const before = await Bun.file(path.join(repo, 'package.json')).json()
    await runScript(repo, 'foo-bar')
    const after = await Bun.file(path.join(repo, 'package.json')).json()

    expect(after.workspaces).toEqual(before.workspaces)
  })

  test('creates the slides/ parent directory if it is missing', async () => {
    expect(await fs.stat(path.join(repo, 'slides')).then(() => true, () => false)).toBe(false)

    const { exitCode } = await runScript(repo, 'foo-bar')

    expect(exitCode).toBe(0)
    expect((await fs.stat(path.join(repo, 'slides'))).isDirectory()).toBe(true)
  })

  test('exits 1 with usage when no name is given', async () => {
    const { exitCode, stderr } = await runScript(repo)

    expect(exitCode).toBe(1)
    expect(stderr).toContain('Usage: bun run init:slide')
  })

  test('exits 1 when the slide already exists', async () => {
    await fs.mkdir(path.join(repo, 'slides/existing'), { recursive: true })

    const { exitCode, stderr } = await runScript(repo, 'existing')

    expect(exitCode).toBe(1)
    expect(stderr).toContain("Directory 'slides/existing' already exists")
  })

  test('treats case-different names as a collision after lowercasing', async () => {
    await runScript(repo, 'foo-bar')

    const { exitCode, stderr } = await runScript(repo, 'FOO-BAR')

    expect(exitCode).toBe(1)
    expect(stderr).toContain("Directory 'slides/foo-bar' already exists")
  })
})
