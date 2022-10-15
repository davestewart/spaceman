function toSentence (value) {
  return value.replace(/\w/, c => c.toUpperCase())
}

function toCamel (value) {
  return value
    .replace(/^\W+|\W$/g, '')
    .replace(/(\W+)(\w)/g, (all, a, b) => b.toUpperCase())
}

function sortObject (data) {
  const keys = Object.keys(data).sort()
  return keys.reduce((output, key) => {
    output[key] = data[key]
    return output
  }, {})
}

function getProperty (data, path = '', defaults = undefined) {
  if (data && typeof path === 'string') {
    const keys = path.trim().split('.')
    do {
      const key = keys.shift()
      if (key && data) {
        data = data[key]
      }
      else {
        return defaults
      }
    } while (keys.length)
  }
  return typeof data === undefined
    ? defaults
    : data
}

function removeItem (arr, item) {
  const index = arr.indexOf(item)
  if (index > -1) {
    arr.splice(index, 1)
  }
}

function toArray (value) {
  return Array.isArray(value)
    ? value
    : [value]
}

function uniq (values) {
  return [...new Set(values)]
}

function wait (ms = 0) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

module.exports = {
  toSentence,
  toCamel,
  sortObject,
  getProperty,
  removeItem,
  toArray,
  uniq,
  wait,
}
