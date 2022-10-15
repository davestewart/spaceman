const { prompt } = require('enquirer')
const { exit } = require('./shell')

/**
 * @typedef   {object}    PromptOptions
 * @property  {Function}  [validate]
 * @property  {Function}  [result]
 * @property  {string}    [type]
 * @property  {*[]}       [choices]
 * @property  {*}         [initial]
 */

function makeChoicesGroup (heading, choices) {
  return {
    role: 'heading',
    value: heading.red,
    choices,
  }
}

/**
 * Chainable
 *
 * @param   {string}          name        The name of the field
 * @param   {string}          message     The label to show in the prompt
 * @param   {PromptOptions}   [options]   Optional options
 * @param   {object}          [input]     Optional input
 * @returns {Promise<object>}             The updated input
 */
function ask (name, message, options = {}, input = {}) {
  // defaults
  const type = 'input'
  const validate = () => true

  // select & multiselect
  if (options.choices && !options.type) {
    options.type = 'select'
  }
  if (options.type === 'multiselect' && !options.validate) {
    options.validate = function (answer) {
      if (answer.length === 0) {
        return 'You must choose at least one item'
      }
      return true
    }
  }

  // prompt
  return prompt({ type, name, message, validate, ...options })
    .then(response => {
      const answer = response[name]
      if (typeof answer === 'string') {
        response[name] = answer.trim()
      }
      return { ...input, ...response }
    })
    .catch(exit)
}

function heading (text, input = {}) {
  console.log(`\n  ${text} :`.grey)
  return input
}

function confirm (message, input = {}) {
  const options = {
    type: 'confirm',
    name: 'confirm',
    message,
    initial: true,
  }
  return prompt(options)
    .then(answer => {
      return answer['confirm']
        ? input
        : exit()
    })
    .catch(exit)
}

// wrapped versions of prompts which can be passed to promises
const _ask = (name, message, options) => (input) => ask(name, message, options, input)
const _heading = (message) => (input) => heading(message, input)
const _confirm = (message) => (input) => confirm(message, input)

module.exports = {
  makeChoicesGroup,
  ask,
  heading,
  confirm,
  _ask,
  _heading,
  _confirm,
}
