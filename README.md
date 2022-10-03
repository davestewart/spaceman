# Turbo Tasks

> Manage Turborepo tasks more easily with a prompt-based CLI

## Overview

[Turborepo](https://turborepo.org/) by [Vercel](https://vercel.com/) is a fantastic monorepo solution but requires a small amount of terminal-fu and configuration to do some basic tasks.

Turbo Tasks moves this to a question-based format then runs the appropriate terminal commands for you:

<p align="center">
  <img src="https://raw.githubusercontent.com/davestewart/turbo-tasks/master/res/screenshot.png" alt="Turbo Tools CLI prompt">
</p>

## Setup

Install the library directly (NPM package [TBC](https://github.com/vercel/turborepo/discussions/2148)):

```bash
npm i @davestewart/turbo-tasks --save-dev
```

## Usage

Run the library by typing its name:

```bash
turbo-tasks
```

You should immediately see set of navigable tasks:

```
? Task … 
  Packages
  ❯ install
    uninstall
    update
    fix
  Workspaces
    share
    group
    add
```

Choose a task to run it and view further options:

```
✔ Task · install
? Workspace … 
  apps
  ❯ client
    extension
    server
  config
    eslint-config-custom
    tsconfig
  packages
    ui
```

The choices should be self-explanatory, but check the documentation below for more detail.

## Packages

See documentation on [Package Installation](https://turborepo.org/docs/handbook/package-installation) on the Turborepo site.

### Install

Install one or more packages to a target repository:

```
Workspace           - pick the target workspace to install to
Packages            - type a space-separated list of packages to install
Dependency type     - pick one of normal, development, peer
```

Confirming will [install](https://turborepo.org/docs/handbook/package-installation#addingremovingupgrading-packages) the new packages.

### Uninstall

Uninstall one or more packages from a target repository:

```
Workspace           - pick the target workspace to uninstall from
Packages            - pick one or more packages to uninstall
```

Confirming will [remove](https://turborepo.org/docs/handbook/package-installation#addingremovingupgrading-packages) the selected packages.

### Update

Update one or more packages in a target repository:

```
Workspace           - pick the target workspace to update
Packages            - type a space-separated list of packages to install
```

Confirming will [update](https://turborepo.org/docs/handbook/package-installation#addingremovingupgrading-packages) the selected packages.

### Fix

Remove all `node_modules` related files from child repos:

```
Confirm fix?      - confirm to fix all workspaces
```

Confirming will:

- remove all `*-lock` files
- remove all `node_modules` folders
- re-run `npm|pnpm|yarn install`

## Workspaces

See documentation on [Workspaces](https://turborepo.org/docs/handbook/workspaces) on the Turborepo site.

### Share

Make a workspace available for use within another workspace:

```
Source workspace    - pick the source workspace to share
Target workspace    - pick the target workspace to update
```

Confirming will:

- set the source workspace as a [dependency](https://turborepo.org/docs/handbook/workspaces#workspaces-which-depend-on-each-other) of the target workspace
- run `npm|pnpm|yarn install`

### Group

Add a new workspace group:

```
Group name          - type a name for the new group
```

Confirming will:

- create a new top-level folder
- add it to the list of [workspaces](https://turborepo.org/docs/handbook/workspaces#configuring-workspaces) in `package.json`
- ask if the user wants to [add](#add) a new workspace

### Add

Add a new child workspace:

```
Workspace group     - pick the target workspace group
Workspace info
 - Workspace        - add name and optional description
 - Scripts          - add optional scripts
 - Dependencies     - add optional dependencies
```

Confirming will:

- create a new workspace folder
- create a private [package](https://turborepo.org/docs/handbook/workspaces#naming-workspaces) file
- optionally install dependencies
