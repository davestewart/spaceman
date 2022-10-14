const Fs = require('fs')

function isValidName (name) {
  const rx = /^[\da-z][-+.\da-z]+$/
  return name.startsWith('@')
    ? name.substring(1).split('/').every(name => rx.test(name))
    : rx.test(name)
}

function getManager () {
  return Fs.existsSync('./yarn.lock')
    ? 'yarn'
    : Fs.existsSync('./pnpm-lock.yaml')
      ? 'pnpm'
      : 'npm'
}

/**
 * Get a manager-specific install / remove / update command
 *
 * @param   {string}   task
 * @param   {string}   depType
 * @param   {string}   workspace
 * @param   {string}   deps
 * @returns {string}
 */
function getCommand (task = 'install', depType = '', workspace = '', deps = '') {
  const manager = getManager()
  const yarnOps = {
    install: 'add',
    uninstall: 'remove',
    update: 'upgrade',
  }
  const isYarn = manager === 'yarn'
  const op = isYarn
    ? yarnOps[task]
    : task
  const flag = task === 'install'
    ? isYarn
      ? depType
        ? `--${depType}`
        : ''
      : depType
        ? `--save-${depType}`
        : deps
          ? '--save'
          : ''
    : ''
  const command = isYarn
    ? workspace
      ? `workspace ${workspace} ${op}`
      : `${op}`
    : workspace
      ? `${op} --workspace=${workspace}`
      : `${op}`
  return `${manager} ${command} ${deps} ${flag}`.replace(/\s+/g, ' ').trim()
}

function getPackagePath (path = '', file = 'package.json') {
  return `.${path}/${file}`
}

function getScripts (path = '') {
  const scripts = readPackage(path).scripts
  return scripts
    ? Object.keys(scripts)
    : []
}

function getDependencies (input) {
  const pkg = typeof input === 'string'
    ? readPackage(input)
    : input
  if (pkg) {
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]
  }
  return []
}

/**
 * Read package.json
 *
 * @param   {string}          path
 * @returns {Package|null}
 */
function readPackage (path = '') {
  path = getPackagePath(path)
  try {
    const text = Fs.readFileSync(path, 'utf-8')
    return JSON.parse(text)
  }
  catch (err) {
    return null
  }
}

function writePackage (path = '', data) {
  path = getPackagePath(path)
  try {
    Fs.writeFileSync(path, JSON.stringify(data, null, '  ') + '\n', 'utf-8')
  }
  catch (err) {
    console.error(err)
  }
}

module.exports = {
  isValidName,
  getManager,
  getCommand,
  getScripts,
  getDependencies,
  readPackage,
  writePackage,
}
