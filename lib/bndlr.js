
var path = require('path'),
	Bundle = require('./Bundle.js'),
	StaticFile = require('./StaticFile.js'),
	configs = {}
	;

module.exports = {
	Bundle: Bundle,
	StaticFile: StaticFile,
	open: function(configpath){
		configpath = path.normalize(configpath);
		var config = configs[configpath];
		if(!config){
			configs[configpath] = config = {};
			//TODO: test what happens if the file doesn't exist
			var raw = require(configpath),
				types = Object.getOwnPropertyNames(raw),
				configdir = path.dirname(configpath);

			types.forEach(function(type){

				var typenode = raw[type],
					bundlenames = Object.getOwnPropertyNames(typenode),
					modifier = module.exports.pathModifier;

				config[type] = {};

				bundlenames.forEach(function(bundlename){
					var files = flatten(typenode[bundlename]);

					for(var i=0;i<files.length;i++){
						var path = files[i];
						if(!(path instanceof Bundle)){
							path = modifier(configdir, type, files[i]);
							files[i] = new StaticFile(path);
						}
					}

					config[type][bundlename] = new Bundle(configdir, type, bundlename, files)
				});
			});
		}
		return config;
	},
	pathModifier: function(configpath, type, filename, isBundle){
		return path.join(configpath, type, filename);
	}
};
function flatten(arr) {
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
