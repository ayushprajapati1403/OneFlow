// 'use strict';
// var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
//     if (k2 === undefined) k2 = k;
//     var desc = Object.getOwnPropertyDescriptor(m, k);
//     if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
//       desc = { enumerable: true, get: function() { return m[k]; } };
//     }
//     Object.defineProperty(o, k2, desc);
// }) : (function(o, m, k, k2) {
//     if (k2 === undefined) k2 = k;
//     o[k2] = m[k];
// }));
// var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
//     Object.defineProperty(o, 'default', { enumerable: true, value: v });
// }) : function(o, v) {
//     o['default'] = v;
// });
// var __importStar = (this && this.__importStar) || function (mod) {
//     if (mod && mod.__esModule) return mod;
//     var result = {};
//     if (mod != null) for (var k in mod) if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
//     __setModuleDefault(result, mod);
//     return result;
// };
// var __importDefault = (this && this.__importDefault) || function (mod) {
//     return (mod && mod.__esModule) ? mod : { 'default': mod };
// };
// Object.defineProperty(exports, '__esModule', { value: true });
// exports.hbs = void 0;
// const hbs = __importStar(require('handlebars'));
// exports.hbs = hbs;
// const moment_1 = __importDefault(require('moment'));
// hbs.registerHelper('dateFormate', (date, format, options) => {
//     return (0, moment_1.default)(date).format(format);
// });
// hbs.registerHelper('inc', function (value, options) {
//     return parseInt(value) + 1;
// });
// hbs.registerHelper('formatPhoneNum', function (value, options) {
//     var cleaned = ('' + value).replace(/\D/g, '');
//     var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
//     if (match) {
//         return match[1] + '-' + match[2] + '-' + match[3];
//     }
//     return value;
// });
// hbs.registerHelper('addition', (key, val, options) => {
//     if (options.data.root[key]) {
//         options.data.root[key] += Number(val);
//     }
//     else {
//         options.data.root[key] = Number(val);
//     }
// });
// hbs.registerHelper('subtraction', (key, val, options) => {
//     if (options.data.root[key]) {
//         options.data.root[key] -= Number(val);
//     }
//     else {
//         options.data.root[key] = Number(val);
//     }
// });
// hbs.registerHelper('round', (val, options) => {
//     return Math.round(val);
// });
// hbs.registerHelper('ceil', (val, options) => {
//     return Math.ceil(val);
// });
// hbs.registerHelper('floor', (val, options) => {
//     return Math.floor(val);
// });
// hbs.registerHelper('percentage', (parVal, totVal, options) => {
//     return (parVal * 100) / totVal;
// });
// hbs.registerHelper('toFixed', (val, num, options) => {
//     return val.toFixed(num);
// });
// hbs.registerHelper('toLowerCase', (str, options) => {
//     return str.toLowerCase();
// });
// hbs.registerHelper('toUpperCase', (str, options) => {
//     return str.toUpperCase();
// });
// hbs.registerHelper('avg', (sum, len, options) => {
//     return sum / len;
// });
// //# sourceMappingURL=handlebars.js.map