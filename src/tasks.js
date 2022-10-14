const Fs = require('fs')
const rimraf = require('rimraf')
const {
  getWorkspaces,
  getWorkspacesChoices,
  getWorkspace,
  getWorkspacePath,
  getWorkspaceGroups,
  getWorkspaceGroupFolders
} = require('./workspaces')
const { toSentence, toCamel, uniq, sortObject, removeItem, toArray } = require('./utils')
const { isValidName, getCommand, getScripts, getDependencies, readPackage, writePackage, getManager } = require('./utils/package')
const { ask, confirm, _ask, _heading, makeChoicesGroup } = require('./utils/enquirer')
const { log, exec, exit } = require('./utils/shell')
const { ROOT } = require('./utils/vars')

// ---------------------------------------------------------------------------------------------------------------------
// region Packages
// ---------------------------------------------------------------------------------------------------------------------

function chooseScript (input = {}) {
  const makeOption = (path, name) => {
    return {
      choice: `${path || '/'}: `.grey + name,
      path,
      name,
    }
  }
  const main = getScripts().map(name => makeOption('', name))
  const other = getWorkspaces()
    .reduce((items, workspace) => {
      const scripts = getScripts(workspace.path).map(name => makeOption(workspace.path, name))
      items.push(...scripts)
      return items
    }, [])
  const items = [...main, ...other]
  const choices = items.map(item => item.choice)

  const options = {
    type: 'autocomplete',
    choices,
    limit: 10,
    result (choice) {
      return items.find(item => item.choice === choice)
    }
  }
  return ask('script', 'Script', options, input)
}

/**
 * Choose a package to install
 *
 * @param   {{ task: string, workspace: string }}    input    Input from previous prompt
 * @returns {Promise<{ task: string, workspace: string, packages: string }>}
 */
function choosePackages (input = {}) {
  // variables
  const name = 'packages'
  const message = 'Package(s)'

  // install
  if (input.task === 'install') {
    const options = {
      validate: answer => {
        answer = answer.trim()
        if (answer === '') {
          return 'Type one or more packages separated by spaces'
        }
        return !!answer
      }
    }
    return ask(name, message, options, input).then(chooseDepType)
  }

  // uninstall / update
  else {
    const workspace = getWorkspace(input.workspace)
    const choices = getDependencies(workspace.path)
    if (choices.length === 0) {
      console.log(`\nWorkspace does not contain any packages to ${input.task}`)
      exit()
    }
    const options = {
      type: 'multiselect',
      choices,
      validate (answer) {
        return answer.length > 0
      },
      result (answer) {
        return answer.join(' ')
      },
    }
    return ask(name, message, options, input)
  }
}

/**
 * Choose a dependency type
 *
 * @param   {object}      input     Input from previous prompt
 * @returns {Promise<{ depType: string }>}
 */
function chooseDepType (input = {}) {
  const depTypes = {
    normal: '',
    development: 'dev',
    peer: 'peer'
  }
  const options = {
    choices: [
      'normal',
      'development',
      'peer'
    ],
    result (answer) {
      return depTypes[answer]
    },
  }
  return ask('depType', 'Dependency type', options, input)
}

// endregion
// ---------------------------------------------------------------------------------------------------------------------
// region Workspaces
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Choose a workspace
 *
 * @param   {object}      input     Input from the previous prompt
 * @returns {Promise<{ workspace: string }>}
 */
function chooseWorkspace (input = {}) {
  const options = {
    choices: getWorkspacesChoices()
  }
  return ask('workspace', 'Workspace', options, input)
}

/**
 * Factory function to choose a workspace group, optionally omitting source group
 *
 * @param   {string}  type      The name of the field to create
 * @param   {boolean} multi     An optional flag to choose multiple workspaces
 * @returns {function(*=): *}
 */
function chooseWorkspaceByType (type = 'source', multi = false) {
  /**
   * Choose a workspace
   *
   * @param   {{ [type]: string }}    input   Input from previous prompt
   * @returns {Promise<{ [type]: string }>}
   */
  return function (input = {}) {
    const options = {
      type: multi ? 'multiselect' : 'select',
      choices: getWorkspacesChoices(getWorkspaces().filter(workspace => workspace.name !== input.source)),
      validate (answer) {
        if (multi) {
          if (answer.length === 0) {
            return 'You must choose at least one workspace'
          }
        }
        return true
      }
    }
    const message = `${toSentence(type)} workspace`
    return ask(type, multi ? `${message}(s)` : message, options, input)
  }
}

/**
 * Choose a workspace group
 *
 * @param   {object}    input    Input from previous prompt
 * @returns {Promise<{ group: string }>}
 */
function chooseWorkspaceGroupName (input = {}) {
  const options = {
    validate (answer) {
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
    },
    result (answer) {
      return answer.trim().toLowerCase() + '/*'
    }
  }

  return ask('group', 'Group name', options, input)
}

/**
 * Choose a workspace group
 *
 * @param   {{ [group]: string }}    input    Input from previous prompt
 * @returns {Promise<{ group: string }>}
 */
function chooseWorkspaceGroup (input = {}) {
  if (input.group) {
    return Promise.resolve(input)
  }
  const options = {
    type: 'select',
    choices: [...getWorkspaceGroups(), ROOT]
  }
  return ask('group', 'Workspace group', options, input)
}

/**
 * Choose workspace options
 *
 * @param   {object}    input     Input from previous prompt
 * @returns {Promise<object>}
 */
function chooseWorkspaceOptions (input = {}) {
  return Promise.resolve(input)
    // workspace
    .then(_heading('Workspace'))
    .then(_ask('name', 'Name', {
      validate: (name) => {
        name = name.trim()
        const path = getWorkspacePath(input.group, name)
        if (!name) {
          return 'The workspace must be named'
        }
        if (!isValidName(name)) {
          return 'Workspace name must be a valid package name'
        }
        if (getWorkspaces().map(workspace => workspace.name).includes(name)) {
          return 'Workspace name must be unique within monorepo'
        }
        if (Fs.existsSync(`.${path}`)) {
          return 'Workspace group cannot be an existing folder'
        }
        return true
      }
    }))
    .then(_ask('description', 'Description'))
    .then(input => {
      const isTypescript = getWorkspaces().some(workspace => Fs.existsSync(`.${workspace.path}/tsconfig.json`))
      const initial = `index.${isTypescript ? 'ts' : 'js'}`
      return ask('main', 'Main file', { initial }, input)
    })

    // deps
    .then(_heading('Dependencies'))
    .then(_ask('deps', 'Main'))
    .then(_ask('devs', 'Dev'))

    // scripts
    .then(_heading('Scripts'))
    .then(_ask('dev', 'Dev'))
    .then(_ask('build', 'Build'))
    .then(_ask('test', 'Test'))

    // final
    .then((options) => {
      return {
        ...input,
        options
      }
    })
}

/**
 * Confirm adding a workspace
 *
 * @param   {object}    input    Input from previous prompt
 * @returns {Promise<object>}
 */
function confirmAddWorkspace (input = {}) {
  return confirm('Add new workspace?', input)
    .then(() => {
      return runTask('add', { group: input.group.replace('/*', '') })
    })
}

/**
 * Confirm removing a workspace
 *
 * @param   {object}    input    Input from previous prompt
 * @returns {Promise<object>}
 */
function confirmRemoveWorkspace (input = {}) {
  const { workspace } = input
  const options = {
    validate (answer) {
      if (answer !== workspace) {
        return `Type "${workspace}" to confirm removal`
      }
      return true
    }
  }
  return ask('confirm', 'Type workspace folder name to confirm removal'.red, options, input)
}

// endregion
// ---------------------------------------------------------------------------------------------------------------------
// region Actions
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Runs a script in a specific package
 *
 * @param   {object}    input     Input from previous prompt
 */
function runScript (input = {}) {
  const { path, name } = input.script
  const manager = getManager()
  const command = manager === 'yarn'
    ? 'yarn'
    : `${manager} run`
  console.log('Running script')
  exec(`cd .${path} && ${command} ${name} && exit`)
}

/**
 * Runs an install, uninstall or update command
 *
 * @param   {object}    input     Input from previous prompt
 */
function runCommand (input = {}) {
  const { task, depType, packages, workspace } = input
  if (task && packages.length && workspace) {
    console.log(`\nRunning: ${task}`)
    exec(getCommand(task, depType, workspace, packages))
  }
  console.log()
}

/**
 * Removes invalid node_modules related files and folders from the monorepo
 *
 * @param   {object}    input     Input from previous prompt
 */
function resetPackages (input = {}) {
  // helpers
  function getPaths (path = '') {
    const paths = [
      `.${path}/.turbo`,
      `.${path}/yarn.lock`,
      `.${path}/package-lock.json`,
      `.${path}/node_modules/`
    ]
    return paths.filter(path => Fs.existsSync(path))
  }

  function removePaths (paths) {
    try {
      paths.forEach(path => {
        log(`rimraf ${path}`)
        rimraf.sync(path)
      })
    }
    // rimraf can sometimes fail, so try again if it does
    catch (err) {
      paths.forEach(path => {
        rimraf.sync(path)
      })
    }
  }

  // workspaces
  let paths = getWorkspaces().reduce((paths, workspace) => {
    paths = [...paths, ...getPaths(workspace.path)]
    return paths
  }, [])
  if (paths.length) {
    console.log('\nResetting workspaces:')
    removePaths(paths)
  }

  // root
  paths = getPaths()
  if (paths.length) {
    console.log('\nResetting root:')
    removePaths(paths)
  }

  // packages
  console.log('\nReinstalling packages:')
  exec(getCommand())
}

/**
 * Creates a workspace group folder and updates package.json
 *
 * @param   {object}    input     Input from previous prompt
 * @returns {object}              Returns input in case createWorkspace() is run after
 */
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

  // return input for optional createWorkspace()
  return input
}

/**
 * Creates a workspace folder, package file, and optionally installs dependencies
 *
 * @param   {object}    input     Input from previous prompt
 */
function createWorkspace (input = {}) {
  // variables
  const { group, options } = input
  const { name, description, main, dev, build, test, deps, devs } = options
  const folder = name.split('/').pop() // in case user has used a namespace
  const path = getWorkspacePath(group, folder)
  const data = {
    name,
    description,
    version: '0.0.0',
    private: true,
    main,
    scripts: {
      dev: dev || undefined,
      build: build || undefined,
      test: test || 'echo "Error: no test specified" && exit 1'
    }
  }

  // add folder / folder
  console.log(`\nCreating folder: ${path.substring(1)}`)
  group === ROOT
    ? createWorkspaceGroup({ group: folder }) // special case if workspace is in root; update package.json
    : Fs.mkdirSync(`.${path}`, { recursive: true })

  // write package
  console.log(`\nWriting: ${path.substring(1)}/package.json`)
  writePackage(path, data)

  // write main file
  if (main) {
    const script = `export function ${toCamel(folder)} () {\n  console.log('${name}')\n}\n`
    Fs.writeFileSync(`.${path}/${main}`, script, 'utf-8')
  }

  // install dependencies
  if (deps || devs) {
    // HACK: NPM doesn't always pick up on the new package; not sure why?
    readPackage(path)

    // install
    console.log()
    if (deps) {
      console.log('Installing dependencies:')
      exec(getCommand('install', '', name, deps))
    }
    if (devs) {
      console.log('Installing dev dependencies:')
      exec(getCommand('install', 'dev', name, devs))
    }
  }
}

/**
 * Removes a workspace by uninstalling dependencies then removing the folder
 *
 * @param   {object}    input     Input from previous prompt
 */
function removeWorkspace (input = {}) {
  const workspace = getWorkspace(input.workspace)
  if (workspace) {
    const { name, group, folder, path } = workspace
    const pkg = readPackage(path)
    if (pkg) {
      // get target workspaces
      const targets = getWorkspaces()
        .map(workspace => {
          const dependencies = getDependencies(workspace.path)
          if (dependencies.includes(name)) {
            return workspace.name
          }
        })
        .filter(name => name)

      // uninstall from target workspaces
      if (targets.length) {
        console.log('\nUninstalling from workspaces:')
        targets.forEach(target => {
          const command = getCommand('uninstall', '', target, name)
          exec(command, true)
        })
      }

      // get local dependencies
      const names = getDependencies(pkg).join(' ')

      // uninstall packages
      if (names.length) {
        console.log('\nUninstalling dependencies:')
        const command = getCommand('uninstall', '', name, names)
        exec(command, true)
      }

      // remove package folder
      // await wait(500)
      console.log(`\nRemoving workspace: ${path.substring(1)}`)
      exec(`rimraf .${path}`)

      // update workspace config
      const pkgMain = readPackage('')
      if (pkgMain) {
        // remove absolute workspace name
        removeItem(pkgMain.workspaces, folder)

        // remove wildcards
        const folders = getWorkspaceGroupFolders(group)
        if (folders.length === 0) {
          console.log('\nRemoving empty workspace group:')
          removeItem(pkgMain.workspaces, `${group}/*`)
          exec(`rimraf ./${group}`)
        }

        // update package
        console.log('\nUpdating: package.json')
        writePackage('', pkgMain)
      }
    }
  }
}

/**
 * Shares a source workspace with one or more target workspaces by updating their package.json
 *
 * @param   {object}    input     Input from previous prompt
 */
function shareWorkspace (input = {}) {
  // variables
  const { source, target } = input
  const name = getWorkspace(source).name
  const targets = toArray(target)

  // update targets
  console.log()
  targets.forEach(target => {
    const { path } = getWorkspace(target)
    const data = readPackage(path)
    if (!data.dependencies) {
      data.dependencies = {}
    }
    data.dependencies[name] = '*'
    data.dependencies = sortObject(data.dependencies)

    // update
    console.log(`Updating: ${path.substring(1)}/package.json`)
    writePackage(path, data)
  })

  // install
  console.log('\nInstalling dependencies:')
  exec(getCommand(), true)
}

// endregion
// ---------------------------------------------------------------------------------------------------------------------
// region Tasks
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Task chooser
 *
 * Builds an Enquirer Select prompt then runs the chosen task
 */
function chooseTask () {
  const choices = [
    makeChoicesGroup('Scripts', [
      'run',
    ]),
    makeChoicesGroup('Packages', [
      'install',
      'uninstall',
      'update',
      'reset'
    ]),
    makeChoicesGroup('Workspaces', [
      'share',
      'group',
      'add',
      'remove'
    ])
  ]
  return Promise
    .resolve(ask('task', '🚀 Task', { choices }))
    .then(input => runTask(input.task))
}

/**
 * Task runner
 *
 * How it works:
 *
 * - prompts are chained with input from the previous prompt
 * - prompts should append to and return input after being called
 * - this way, after the final prompt, the action will have all user input in a single object
 * - failure to do this will either result in an error or unexpected results!
 *
 * @param   {string}    task      The task to run
 * @param   {object}   [input]    Optional input from previous task
 * @returns {Promise<{}>|Promise<void>}
 */
function runTask (task, input = {}) {
  // prepare input
  input = { task, ...input }

  // run task!
  switch (task) {
    case 'run':
      return Promise.resolve(input)
        .then(chooseScript)
        .then(runScript)

    case 'install':
    case 'uninstall':
    case 'update':
      return Promise.resolve(input)
        .then(chooseWorkspace)
        .then(choosePackages)
        .then(confirmTask)
        .then(runCommand)

    case 'reset':
      return Promise.resolve(input)
        .then(confirmTask)
        .then(resetPackages)

    case 'share':
      return Promise.resolve(input)
        .then(chooseWorkspaceByType('source'))
        .then(chooseWorkspaceByType('target', true))
        .then(confirmTask)
        .then(shareWorkspace)
        .then(exit)

    case 'group':
      return Promise.resolve(input)
        .then(chooseWorkspaceGroupName)
        .then(confirmTask)
        .then(createWorkspaceGroup)
        .then(confirmAddWorkspace)

    case 'add':
      return Promise.resolve(input)
        .then(chooseWorkspaceGroup)
        .then(chooseWorkspaceOptions)
        .then(confirmTask)
        .then(createWorkspace)

    case 'remove':
      return Promise.resolve(input)
        .then(chooseWorkspace)
        .then(confirmRemoveWorkspace)
        .then(removeWorkspace)

    default:
      console.log(`Unknown task "${task}"`)
      exit()
  }
}

/**
 * Confirm a task
 *
 * @param   {{ task: string }}    input   Input from previous prompt
 * @returns {Promise<{ task: string }>}
 */
function confirmTask (input) {
  return confirm(`Confirm ${input.task}?`, input)
}

// ---------------------------------------------------------------------------------------------------------------------
// export chooser
// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
  chooseTask
}
