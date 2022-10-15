const { readPackage } = require('./package')
const { getProperty } = require('./index')

/**
 * Get a Spaceman setting from package.json
 *
 * @param   {string}      setting
 * @param   {*}           defaults
 * @returns {string|{}}
 */
function getSetting (setting = '', defaults = undefined) {
  let settings = readPackage()?.spaceman || {}
  return getProperty(settings, setting, defaults)
}

module.exports = {
  getSetting,
}
