const Fs = require('fs')
const { makeChoicesGroup } = require('./utils/enquirer')
const { readPackage } = require('./utils/package')
const { exit } = require('./utils/shell')
const { ROOT } = require('./utils/vars')

// ---------------------------------------------------------------------------------------------------------------------
// functions
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Package.json info
 *
 * @typedef   {Object}                      Package
 * @property  {string}                      name              The package name
 * @property  {string[]}                    [workspaces]      A list of workspaces
 * @property  {Object.<string, string>}     dependencies      A list of dependencies
 * @property  {Object.<string, string>}     devDependencies   A list of dev dependencies
 */

/**
 * Workspace info
 *
 * @typedef   {Object}     Workspace
 * @property  {string}     name             The package name, e.g. tools or @web/tools
 * @property  {string}     group            The workspace group, e.g. apps
 * @property  {string}     folder           The workspace folder, e.g. web
 * @property  {string}     path             The workspace path, e.g. apps/web
 */

/**
 * Get groups within a workspace
 *
 * @returns {string[]}
 */
function getWorkspaceGroups () {
  const workspaces = readPackage().workspaces
  return workspaces
    ? workspaces
      .filter(group => group.endsWith('*'))
      .map(group => group.replace('/*', ''))
    : []
}

/**
 * Get folders within a workspace group
 *
 * @param   {string}    group
 * @returns {string[]}
 */
function getWorkspaceGroupFolders (group) {
  return Fs
    .readdirSync(`./${group}`, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
}

/**
 * Get a workspace by value
 *
 * @param   {string}  value
 * @param   {string}  key
 * @returns {Workspace|null}
 */
function getWorkspace (value, key = 'name') {
  return workspaces.find(workspace => workspace[key] === value) || null
}

/**
 * Get information about a workspace
 *
 * @param   {string}        folder
 * @param   {string}        group
 * @returns {Workspace}
 */
function getWorkspaceInfo (folder, group = '') {
  const path = group
    ? `/${group}/${folder}`
    : `/${folder}`
  const pkg = readPackage(path)
  if (pkg) {
    const name = pkg.name
    return {
      name,
      folder,
      group,
      path,
    }
  }
}

/**
 * Helper function to get the relative path of a workspace
 *
 * This function factors out the special ROOT group value
 *
 * @param   {string}  group
 * @param   {string}  folder
 * @returns {string}
 */
function getWorkspacePath (group, folder) {
  return group === ROOT
    ? `/${folder}`
    : `/${group}/${folder}`
}

/**
 * Gets all workspaces
 *
 * @returns {Workspace[]}
 */
function getWorkspaces () {
  return workspaces
}

/**
 * Gets an Enquirer choices from a source set of workspaces
 *
 * @param   {Workspace[]}   spaces
 * @returns {{role: string, choices: *, value: *}[]}
 */
function getWorkspacesChoices (spaces = workspaces) {
  const groups = {}
  const root = []
  for (const workspace of spaces) {
    const { group, folder, name } = workspace
    if (!group) {
      root.push(folder)
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
// init
// ---------------------------------------------------------------------------------------------------------------------

const pkg = readPackage()

if (!pkg) {
  console.log('No package file in this folder')
  exit()
}

if (!pkg.workspaces) {
  console.log('No workspaces in this package')
  exit()
}

const workspaces = pkg.workspaces
  .map(ref => {
    if (ref.endsWith('/*')) {
      const group = ref.replace('/*', '')
      if (Fs.existsSync(group)) {
        return getWorkspaceGroupFolders(group)
          .map(folder => getWorkspaceInfo(folder, group))
      }
    }
    else {
      return getWorkspaceInfo(ref)
    }
  })
  .flat()
  .filter(e => e)

// ---------------------------------------------------------------------------------------------------------------------
// exports
// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
  getWorkspaces,
  getWorkspacesChoices,
  getWorkspace,
  getWorkspacePath,
  getWorkspaceGroupFolders,
  getWorkspaceGroups,
}
