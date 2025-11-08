// import * as hbs from 'handlebars'
// import moment from 'moment'
// hbs.registerHelper('dateFormate', (date, format, options) => {
//   return moment(date).format(format)
// })
// hbs.registerHelper('inc', function (value, options) {
//   return parseInt(value) + 1
// })
// hbs.registerHelper('formatPhoneNum', function (value, options) {
//   const cleaned = ('' + value).replace(/\D/g, '')
//   const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
//   if (match) {
//     return match[1] + '-' + match[2] + '-' + match[3]
//   }
//   return value
// })
// hbs.registerHelper('addition', (key, val, options) => {
//   if (options.data.root[key]) {
//     options.data.root[key] += Number(val)
//   } else {
//     options.data.root[key] = Number(val)
//   }
// })
// hbs.registerHelper('subtraction', (key, val, options) => {
//   if (options.data.root[key]) {
//     options.data.root[key] -= Number(val)
//   } else {
//     options.data.root[key] = Number(val)
//   }
// })
// hbs.registerHelper('round', (val, options) => {
//   return Math.round(val)
// })
// hbs.registerHelper('ceil', (val, options) => {
//   return Math.ceil(val)
// })
// hbs.registerHelper('floor', (val, options) => {
//   return Math.floor(val)
// })
// hbs.registerHelper('percentage', (parVal, totVal, options) => {
//   return (parVal * 100) / totVal
// })
// hbs.registerHelper('toFixed', (val, num, options) => {
//   return val.toFixed(num)
// })
// hbs.registerHelper('toLowerCase', (str, options) => {
//   return str.toLowerCase()
// })
// hbs.registerHelper('toUpperCase', (str, options) => {
//   return str.toUpperCase()
// })
// hbs.registerHelper('avg', (sum, len, options) => {
//   return sum / len
// })
// export { hbs }
