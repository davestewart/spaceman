#!/usr/bin/env node

const Fs = require('fs')
const shell = require('shelljs')
const enquirer = require('enquirer')
require('colors')

const { Input, Select, MultiSelect, Confirm, Form } = enquirer

const ROOT = '[root]'.grey

// ---------------------------------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------------------------------

function capitalise (value) {
  return value.replace(/\w/, c => c.toUpperCase())
}

function uniq (values) {
  return [...new Set(values)]
}

function isValidName (name) {
  return /^[\da-z][-+.\da-z]+$/.test(name)
}

function getKeys (data = {}) {
  return Object.keys(data)
}

function getName (string) {
  return string.split('/').pop()
}

function sortObject (data) {
  const keys = Object.keys(data).sort()
  return keys.reduce((output, key) => {
    output[key] = data[key]
    return output
  }, {})
}

function makeChoicesGroup (heading, choices) {
  return {
    role: 'heading',
    value: heading.red,
    choices
  }
}

function getManager () {
  return Fs.existsSync('./yarn.lock')
    ? 'yarn'
    : Fs.existsSync('./pnpm-lock.yaml')
      ? 'pnpm'
      : 'npm'
}

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
  const flag = isYarn
    ? depType
      ? `--${depType}`
      : ''
    : depType
      ? `--save-${depType}`
      : deps
        ? '--save'
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

function getPackagePath (path = '') {
  return `.${path}/package.json`
}

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
    Fs.writeFileSync(path, JSON.stringify(data, null, '  '), 'utf-8')
  }
  catch (err) {
    console.error(err)
  }
}

function exec (command) {
  console.log('» '.green + command.brightWhite)
  const res = shell.exec(command) // { silent }
  if (res.code !== 0) {
    console.log()
    shell.exit(0)
  }
  return res.stdout
}

function exit () {
  console.log()
  process.exit(0)
}

// ---------------------------------------------------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------------------------------------------------

const pkg = readPackage()

if (!pkg) {
  console.log('No package file in this folder')
  exit()
}

function getWorkspaceInfo (workspace, group = '') {
  const path = group
    ? `/${group}/${workspace}`
    : `/${workspace}`
  const pkg = readPackage(path)
  const name = pkg?.name
  if (name) {
    return {
      path,
      group,
      name,
    }
  }
}

const workspaces = pkg.workspaces
  .map(id => {
    if (id.endsWith('/*')) {
      const folder = id.replace('/*', '')
      if (Fs.existsSync(folder)) {
        return Fs
          .readdirSync(`./${folder}`, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => getWorkspaceInfo(entry.name, folder))
      }
    }
    else {
      return getWorkspaceInfo(id)
    }
  })
  .flat()
  .filter(e => e)

function getWorkspaceGroups () {
  const workspaces = readPackage().workspaces
  return workspaces
    ? workspaces
      .filter(name => name.endsWith('*'))
      .map(name => name.replace('/*', ''))
    : []
}

function getWorkspace (name) {
  return workspaces.find(workspace => workspace.name === name)
}

function getWorkspacePath (group, workspace) {
  return group === ROOT
    ? `/${workspace}`
    : `/${group}/${workspace}`
}

function getWorkspacesOptions (spaces = workspaces) {
  const groups = {}
  const root = []
  for (const workspace of spaces) {
    const { group, name } = workspace
    if (!group) {
      root.push(name)
      continue
    }
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(name)
  }
  const choices = Object.keys(groups).sort().map(group => {
    return makeChoicesGroup(group, groups[group])
  })
  if (root.length) {
    choices.push(makeChoicesGroup(ROOT, root))
  }
  return choices
}

// ---------------------------------------------------------------------------------------------------------------------
// questions
// ---------------------------------------------------------------------------------------------------------------------

function chooseTask () {
  const choices = [
    makeChoicesGroup('Packages', [
      'install',
      'uninstall',
      'update',
      'fix',
    ]),
    makeChoicesGroup('Workspaces', [
      'share',
      'group',
      'add',
    ]),
  ]
  const prompt = new Select({
    name: 'task',
    message: 'Task',
    choices,
  })
  return prompt
    .run()
    .catch(exit)
}

function runTask (task, input = {}) {
  // set task
  input = { task, ...input }

  // share workspace
  if (task === 'share') {
    return Promise.resolve(input)
      .then(chooseWorkspaceByType('source'))
      .then(chooseWorkspaceByType('target'))
      .then(confirmTask)
      .then(addSharedWorkspace)
      .then(exit)
  }

  // add workspace group
  else if (task === 'group') {
    return Promise.resolve(input)
      .then(chooseWorkspaceGroupName)
      .then(confirmTask)
      .then(createWorkspaceGroup)
      .then(confirmAddWorkspace)
  }

  // add workspace
  else if (task === 'add') {
    return Promise.resolve(input)
      .then(chooseWorkspaceGroup)
      .then(chooseWorkspaceOptions)
      .then(confirmTask)
      .then(createWorkspace)
  }

  // fix all packages
  else if (task === 'fix') {
    return Promise.resolve(input)
      .then(confirmTask)
      .then(fixPackages)
  }

  // install, remove, update packages
  return Promise.resolve(input)
    .then(chooseWorkspace)
    .then(choosePackages)
    .then(confirmTask)
    .then(runCommand)
}

function confirmTask (input) {
  const prompt = new Confirm({
    name: 'confirm',
    message: `Confirm ${input.task}?`,
    initial: true,
  })
  return prompt.run()
    .then(answer => {
      return answer
        ? input
        : exit()
    })
    .catch(exit)
}

// ---------------------------------------------------------------------------------------------------------------------
// packages
// ---------------------------------------------------------------------------------------------------------------------

function chooseWorkspace (input = {}) {
  const prompt = new Select({
    name: 'workspace',
    message: 'Workspace',
    choices: getWorkspacesOptions()
  })
  return prompt.run()
    .then(answer => {
      return { ...input, workspace: getName(answer) }
    })
    .catch(exit)
}

function choosePackages (input = {}) {
  // install
  if (input.task === 'install') {
    const prompt = new Input({
      name: 'packages',
      message: 'Package(s)',
      validate: answer => {
        answer = answer.trim()
        if (answer === '') {
          return 'Type one or more packages separated by spaces'
        }
        return !!answer
      }
    })
    return prompt.run()
      .then(answer => {
        return chooseDepType({
          ...input,
          packages: answer.trim()
        })
      })
      .catch(exit)
  }

  // uninstall / update
  else {
    const workspace = getWorkspace(input.workspace)
    const pkg = readPackage(workspace.path)
    const choices =  [
      ...getKeys(pkg.dependencies),
      ...getKeys(pkg.devDependencies),
    ]
    if (choices.length === 0) {
      console.log(`Workspace does not contain any packages to ${input.task}`)
      exit()
    }
    const prompt = new MultiSelect({
      name: 'packages',
      message: 'Package(s)',
      choices,
      validate: answer => answer.length > 0
    })
    return prompt.run()
      .then(answer => {
        return {
          ...input,
          packages: answer.join(' '),
        }
      })
      .catch(exit)
  }
}

function chooseDepType (input = {}) {
  const depTypes = {
    normal: '',
    development: 'dev',
    peer: 'peer',
  }
  const prompt = new Select({
    name: 'depType',
    message: 'Dependency type',
    choices: [
      'normal',
      'development',
      'peer',
    ]
  })
  return prompt.run()
    .then(answer => {
      return {
        ...input,
        depType: depTypes[answer],
      }
    })
    .catch(exit)
}

function runCommand (input = {}) {
  const { task, depType, packages, workspace } = input
  if (task && packages.length && workspace) {
    console.log(`Running ${task} ...`)
    exec(getCommand(task, depType, workspace, packages))
  }
  console.log()
}

function fixPackages () {
  console.log()

  // manager
  const command = getCommand()

  // cleanup
  console.log(`Resetting workspaces ...`)
  workspaces.forEach(workspace => {
    // variables
    const { path } = workspace
    const turboPath = `.${path}/.turbo`
    const nodePath = `.${path}/node_modules`
    const lockPath = `.${path}/package-lock.json`
    const yarnPath = `.${path}/yarn.lock`

    // do it
    if (Fs.existsSync(turboPath)) {
      exec(`rimraf ${turboPath}`)
    }
    if (Fs.existsSync(nodePath)) {
      exec(`rimraf ${nodePath}`)
    }
    if (Fs.existsSync(lockPath)) {
      Fs.rmSync(lockPath)
    }
    if (Fs.existsSync(yarnPath)) {
      Fs.rmSync(yarnPath)
    }
  })

  // packages
  console.log('Reinstalling packages ...')
  exec(command)
}

// ---------------------------------------------------------------------------------------------------------------------
// workspaces
// ---------------------------------------------------------------------------------------------------------------------

function chooseWorkspaceByType (type = 'source') {
  return function (input = {}) {
    const prompt = new Select({
      name: 'workspace',
      message: `${capitalise(type)} workspace`,
      choices: getWorkspacesOptions(workspaces.filter(workspace => workspace.name !== input.source))
    })
    return prompt.run()
      .then(answer => {
        return {
          ...input,
          [type]: answer
        }
      })
      .catch(exit)
  }
}

function addSharedWorkspace (input = {}) {
  // variables
  const { source, target } = input
  const { path } = getWorkspace(target)
  const data = readPackage(path)
  if (!data.dependencies) {
    data.dependencies = {}
  }
  data.dependencies[source] = '*'
  data.dependencies = sortObject(data.dependencies)

  // update
  console.log(`Updating "${path.substring(1)}/package.json" ...`)
  writePackage(path, data)

  // install
  console.log('Installing dependencies ...')
  exec(getCommand())
}

function chooseWorkspaceGroupName (input = {}) {
  const prompt = new Input({
    name: 'group',
    message: 'Group name',
    validate: answer => {
      const name = answer.trim()
      if (!name) {
        return 'The workspace group must be named'
      }
      if (!isValidName(name)) {
        return 'Workspace group must be a valid folder name'
      }
      if (Fs.existsSync(`./${name}`)) {
        return 'Workspace group conflicts with existing folder'
      }
      return !!name
    }
  })
  return prompt.run()
    .then(answer => {
      return {
        ...input,
        group: answer.trim().toLowerCase() + '/*',
      }
    })
    .catch(exit)
}

function createWorkspaceGroup (input = {}) {
  // variables
  const { group } = input

  // folder
  const path = group.replace(/\/\*$/, '')
  Fs.mkdirSync(`./${path}`)

  // package file
  const data = readPackage()
  if (!data.workspaces) {
    data.workspaces = []
  }
  data.workspaces = uniq([...data.workspaces, group])
  writePackage('', data)

  // return input for optional create workspace
  return input
}

function chooseWorkspaceGroup (input = {}) {
  if (input.group) {
    return input
  }
  const choices = [...getWorkspaceGroups(), ROOT]
  const prompt = new Select({
    name: 'group',
    message: 'Workspace group',
    choices,
  })
  return prompt.run()
    .then(answer => {
      return {
        ...input,
        group: answer.trim(),
      }
    })
    .catch(exit)
}

function confirmAddWorkspace (input = {}) {
  const prompt = new Confirm({
    name: 'confirm',
    message: 'Add new workspace?',
    initial: true,
  })
  return prompt.run()
    .then(answer => answer && runTask('add', { group: input.group }))
    .catch(exit)
}

function chooseWorkspaceOptions (input = {}) {
  const options = {}

  function heading (text) {
    return () => console.log(`\n  ${text} :`.grey)
  }

  function ask (name, message, validate = undefined) {
    return function () {
      const prompt = new Input({ name, message, validate })
      return prompt.run()
        .then(answer => options[name] = answer.trim())
        .catch(exit)
    }
  }

  return Promise.resolve()
    // workspace
    .then(heading('Workspace'))
    .then(ask('name', 'Name', function (name) {
      name = name.trim()
      const path = getWorkspacePath(input.group, name)
      if (!name) {
        return 'The workspace must be named'
      }
      if (!isValidName(name)) {
        return 'Workspace name must be a valid package name'
      }
      if (workspaces.map(workspace => workspace.name).includes(name)) {
        return 'Workspace name must be unique within monorepo'
      }
      if (Fs.existsSync(`.${path}`)) {
        return 'Workspace group cannot be an existing folder'
      }
      return true
    }))
    .then(ask('description', 'Description'))

    // scripts
    .then(heading('Scripts'))
    .then(ask('dev', 'Dev'))
    .then(ask('build', 'Build'))
    .then(ask('test', 'Test'))

    // deps
    .then(heading('Dependencies'))
    .then(ask('deps', 'Main'))
    .then(ask('devs', 'Dev'))
    .then(() => {
      return {
        ...input,
        options,
      }
    })
}

function createWorkspace (input = {}) {
  // variables
  const { group, options } = input
  const { name, description, dev, build, test, deps, devs } = options
  const workspace = name.split('/').pop() // in case user has used a namespace
  const path = getWorkspacePath(group, workspace)
  const data = {
    name,
    description,
    version: '0.0.0',
    private: true,
    scripts: {
      dev: dev || undefined,
      build: build || undefined,
      test: test || 'echo "Error: no test specified" && exit 1',
    },
  }

  // write package
  console.log(`Creating workspace "${path.substring(1)}" ...`)
  group === ROOT
    ? createWorkspaceGroup({ group: name }) // special case if workspace is in root; update package.json
    : Fs.mkdirSync(`.${path}`, { recursive: true })

  console.log(`Writing "package.json" ...`)
  writePackage(path, data)

  // install dependencies
  if (deps || devs) {
    if (deps) {
      console.log('Installing dependencies ...')
      exec(getCommand('install', '', workspace, deps))
    }
    if (devs) {
      console.log('Installing dev dependencies ...')
      exec(getCommand('install', 'dev', workspace, devs))
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------------------------------------------------

console.log()

Promise.resolve()
  .then(chooseTask)
  .then(runTask)
