var other = require('./../index.js').open(__dirname+'/other.config.js');

var ui = [
	'ui1.js',
	'ui2.js'
]

module.exports = {
	js: {
		global: [
			'file1.js',
			'file2.js',
			ui
		],
		login: [
			'auth.js',
			other.js.validation
		]
	},
	css: {
		global: [
			'file1.css',
			'file2.css'
		]
	}
};
