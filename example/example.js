
var bndlr = require("./../index.js"),
	path = require('path');

bndlr.pathModifier = function(configdir, type, filename){
	//interpret where the files are stored locally
	return path.join(configdir, type, filename);
};

bndlr.StaticFile.prototype.uniqueFileNamer = function(){
	//configure the url the file is located at
	return '/'+this.type+'/' + this.md5;
};

bndlr.Bundle.prototype.uniqueFileNamer = function(){
	//configure the url the bundle is located at
	return '/example/' + this.md5 + '.' + this.type;
};

//open a config
var	cfg = bndlr.open(__dirname+'/example.config.js');


cfg.js.global.files.forEach(function(file){
	console.log(file.uniqueFileName);
});
