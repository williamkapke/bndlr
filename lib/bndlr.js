
var fs = require('fs'),
	path = require('path'),
	Bundle = require('./Bundle.js'),
	StaticFile = require('./StaticFile.js'),
	middleware,
	configs = {}
	;

exports = module.exports = {
	Bundle: Bundle,
	StaticFile: StaticFile,
	webroot: path.dirname(require.main.filename), //assumes the main module is at the webroot (like: app.js)
	configs: configs,
	configName: 'bundle.config.js',
	open: function open(configpath){
		configpath = path.normalize(configpath);
		var config = configs[configpath];
		if(!config){
			configs[configpath] = config = new Config(configpath);

			//TODO: test what happens if the file doesn't exist
			var raw = require(configpath),
				types = Object.getOwnPropertyNames(raw),
				configdir = path.dirname(configpath);

			types.forEach(function(type){

				var typenode = raw[type],
					bundlenames = Object.getOwnPropertyNames(typenode),
					modifier = exports.getFilePath;

				config[type] = {};

				bundlenames.forEach(function(bundlename){
					var files = flatten(typenode[bundlename]);

					for(var i=0;i<files.length;i++){
						var path = files[i];
						if(!(path instanceof Bundle)){
							if(path[0]=='/')
								path = exports.webroot + path;
							path = modifier(configdir, type, path);
							files[i] = new StaticFile(path);
						}
					}

					config[type][bundlename] = new Bundle(configdir, type, bundlename, files)
				});
			});
		}
		return config;
	},
	findConfigs: function(dirs, callback){
		if(!Array.isArray(dirs)) dirs = [dirs];
		require('child_process').execFile('find', dirs.concat(['-name', exports.configName, '-print' ]), function(err, stdout, stderr) {
			var files = stdout.substring(0, stdout.length-1).split('\n');
			callback(files);
		});
	},

	//determines the absolute path to a file on disk
	getFilePath: function(basedir, type, filename){
		return path.join(basedir, type, filename);
	},
	addMin: function(filename){
		return filename.replace(/(\.[a-z]+)?$/, ".min$1");
	}
};
Object.defineProperties(exports, {

	//Allows the folder to be renamed without needing to overriding a ton of things
	staticDir: {
		writable: true,
		value: 'static'
	},
	dynamicHelpers: {
		value: {
			style: function(req, res){
				return function(filename){
					return '<link rel=stylesheet href="' +res.__dynamicHelpers.static('css',filename)+ '" />';
				};
			},
			script: function(req, res){
				return function(filename){
					return '<script src="' +res.__dynamicHelpers.static('js',filename)+ '"></script>';
				};
			},
			static: function(req, res){
				var min = !!+(req.query.min||exports.min);
				return function(type, filename){
					if(filename[0] != '/')
						filename = '/'+exports.staticDir +'/'+ type +'/'+ filename;
					if(min)
						filename = exports.addMin(filename);
					return filename;
				};
			}
		}
	},
	min: {
		value: (process.env.NODE_ENV || "development") != "development"
	},
	"middleware": {
		get: function(){
			return middleware || (middleware=require('./bndlr_middleware.js'));
		}
	}
});


function Config(path){
	Object.defineProperty(this, "path", {
		enumerable:false,
		value: path
	});
}
Object.defineProperty(Config.prototype, "generateFiles", {
	value: function(outDir, minified, callback){
		for(var type in this){
			var bundles = this[type],
				typePath = outDir + '/' + type,
				completed = 0;

			function done(){
				completed++;
				if(completed==2)
					callback();
			}

			mkdirp(typePath);
			for(var bundlename in bundles){
				var bundle = bundles[bundlename];

				if(!minified || minified=="both"){
					bundle.saveTo(typePath, false, done);
				}
				if(minified){
					bundle.saveTo(typePath, true, done);
				}
			}
		}
	}
});


function mkdirp(p, mode) {
	if (mode === undefined) {
		mode = 0777 & (~process.umask());
	}

	if (typeof mode === 'string') mode = parseInt(mode, 8);
	p = path.resolve(p);

	try {
		fs.mkdirSync(p, mode)
	}
	catch (err0) {
		switch (err0.code) {
			case 'ENOENT' :
				var err1 = mkdirp(path.dirname(p), mode)
				if (err1) throw err1;
				else return mkdirp(p, mode);
				break;

			case 'EEXIST' :
				var stat;
				try {
					stat = fs.statSync(p);
				}
				catch (err1) {
					throw err0
				}
				if (!stat.isDirectory()) throw err0;
				else return null;
				break;
			default :
				throw err0
				break;
		}
	}

	return null;
}
function flatten(arr) {
	if(!Array.isArray(arr))
		return [arr];
	var retVal = [];
	function dive(item){
		if (Array.isArray(item))
			item.forEach(dive);
		else
			retVal.push(item);
	}
	arr.forEach(dive);
	return retVal;
}
