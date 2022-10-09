const shell = require('shelljs')

function log (text) {
  console.log('» '.grey + text.red)
}

function exec (command, silent = false) {
  log(command)
  const res = shell.exec(command, { silent })
  if (res.code !== 0) {
    console.log('\n' + res.stderr)
    shell.exit(0)
  }
  return res.stdout
}

function exit () {
  console.log()
  process.exit(0)
}

module.exports = {
  log,
  exec,
  exit,
}
