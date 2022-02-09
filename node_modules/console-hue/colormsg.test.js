const getColorMsg = require('./colormsg.js')

test('Testing error message', () => {
  const res = getColorMsg('error', 'this is an error')
  expect(JSON.stringify(res).slice(7, 11)).toBe('[31m')
})

test('Testing success message', () => {
  const res = getColorMsg('success', 'this is a success')
  expect(JSON.stringify(res).slice(7, 11)).toBe('[32m')
})

test('Testing expect String', () => {
  const res = getColorMsg('log', 'this is a log')
  expect(res.constructor.name).toBe('String')
})

test('Testing stringifying Arrays', () => {
  const res = getColorMsg('log', ['this', 'is', 'a', 'log'])
  expect(res.constructor.name).toBe('String')
})

test('Testing stringifying Objects', () => {
  const res = getColorMsg('log', {msg: 'this is a log'})
  expect(res.constructor.name).toBe('String')
})

test('Testing undefined message', () => {
  const res = getColorMsg('log')
  expect(res.constructor.name).toBe('String')
})
