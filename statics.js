
const copy = require('copy'),
c = console.log

copy(
'./src/statics/**/*.*',
'./public/',
err => (err) ? c(err.message) : c('Archivos copiados con éxito')
)