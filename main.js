#!/usr/bin/env node
require('colors')
yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { runTask, chooseTask } = require('./src/tasks')

// args
const argv = yargs(hideBin(process.argv)).argv
const [task] = argv._

// tasks
console.log()
task
  ? runTask(task)
  : chooseTask()
