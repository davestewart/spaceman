# 🧑‍🚀 Spaceman

> Easily manage monorepo / workspace tasks via a prompt-based CLI

## Abstract

Workspaces – which are supported by [NPM](https://docs.npmjs.com/cli/v8/using-npm/workspaces), [PNPM](https://pnpm.io/workspaces) and [Yarn](https://classic.yarnpkg.com/lang/en/docs/workspaces/) – provide a streamlined workflow to manage multiple packages within a single repository, but require a certain amount of knowledge, configuration and terminal-fu for everyday tasks.


## Overview

Spaceman makes running workspace tasks easier by wrapping them in a question-based format:

<p align="center">
  <img src="https://raw.githubusercontent.com/davestewart/spaceman/master/res/spaceman.gif" alt="Spaceman CLI">
</p>

Confirming prompts will update config, run commands, create, update and delete folders or files as needed – even stubbing out new workspaces with initial content to let you quickly get up-to-speed with your monorepo setup 🚀

## Setup

Install the library via NPM:

```bash
npm i @davestewart/spaceman --save-dev
```

## Usage

Run the library by typing its name:

```bash
spaceman
```

You should immediately see set of navigable tasks:

```
? 🚀 Task … 
  Packages
  ❯ install
    uninstall
    update
    reset
  Workspaces
    share
    group
    add
    remove
```

Choose a task to run it and view further options:

```
✔ 🚀 Task · install
? Workspace … 
  apps
  ❯ docs
    web
  packages
    eslint-config-custom
    tsconfig
    ui
```

The choices should be self-explanatory, but check the documentation below for more detail.

## Packages

### Install

Install one or more packages to a target repository:

```
Workspace           - pick the target workspace to install to
Packages            - type a space-separated list of packages to install
Dependency type     - pick one of normal, development, peer
```

Confirming will install the new packages.

### Uninstall

Uninstall one or more packages from a target repository:

```
Workspace           - pick the target workspace to uninstall from
Packages            - pick one or more packages to uninstall
```

Confirming will remove the selected packages.

### Update

Update one or more packages in a target repository:

```
Workspace           - pick the target workspace to update
Packages            - type a space-separated list of packages to install
```

Confirming will update the selected packages.

### Reset

Remove all Node modules-related files in all repos, and reinstall:

```
Confirm reset?      - confirm to reset repo and workspaces
```

Confirming will:

- remove all `lock` files
- remove all `node_modules` folders
- re-run `npm|pnpm|yarn install`

Running `reset` can get you out of tricky situations where workspace installs [fail](https://github.com/npm/cli/issues/3847) or your IDE reports that seemingly-installed workspaces aren't. 

## Workspaces

### Share

Make a workspace available for use within another workspace:

```
Source workspace    - pick the source workspace to share
Target workspace(s)  - pick the target workspace(s) to update
```

Confirming will:

- set the source workspace as a dependency of the target workspace
- run `npm|pnpm|yarn install`

### Group

Add a new workspace group:

```
Group name          - type a name for the new group
```

Confirming will:

- create a new top-level folder
- add it to the list of workspaces in `package.json`
- ask if the user wants to [add](#add) a new workspace

### Add

Add a new workspace:

```
Workspace group     - pick the target workspace group
Workspace info
 - Workspace        - add name, optional description and `main` file
 - Dependencies     - add optional dependencies
 - Scripts          - add optional scripts
```

Confirming will:

- create a new workspace folder
- create a private package file
- create a stub `"main": "index.ts/js"` file with named export
- optionally install dependencies

### Remove

Remove an existing workspace:

```
Workspace           - pick the target workspace
Type to confirm     - type the name of the workspace to confirm deletion
```

Confirming will:

- uninstall workspace dependencies 
- remove the workspace folder
- optionally update the repository's `workspaces` list

## Finally...

If you like the package, a [tweet](https://twitter.com/intent/tweet?text=🧑‍🚀%20Spaceman%20is%20a%20new%20package%20by%20%40dave_stewart%20to%20easily%20manage%20NPM%20and%20Yarn%20monorepo%20tasks%20via%20a%20prompt-based%20CLI%20🚀%0A%0Ahttps%3A//github.com/davestewart/spaceman%0A%0A%23javascript%20%23node%20%23monorepo) is always helpful; be sure to let me know via [@dave_stewart](https://twitter.com/dave_stewart).

Thanks!
