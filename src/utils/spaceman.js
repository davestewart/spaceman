const { readPackage } = require('./package')

/**
 * Get a Spaceman setting from package.json
 *
 * @param   {string}      setting
 * @returns {string|{}}
 */
function getSetting (setting = '') {
  let settings = readPackage()?.spaceman || {}
  if (settings) {
    const keys = setting.split('.')
    do {
      const key = keys.shift()
      if (key && settings) {
        settings = settings[key]
      }
      else {
        return undefined
      }
    } while (keys.length)
  }
  return settings
}

module.exports = {
  getSetting,
}
