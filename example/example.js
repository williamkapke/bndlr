
var bndlr = require("./../index.js"),
	path = require('path'),
	uglify = require('uglify-js'),
	jsparser = uglify.parser,
	jsprocessor = uglify.uglify,
	cleancss = require('clean-css')
	;

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
bndlr.StaticFile.compressors.js = function(content){
	var ast = jsparser.parse(content); // parse code and get the initial AST
	ast = jsprocessor.ast_mangle(ast); // get a new AST with mangled names
	ast = jsprocessor.ast_squeeze(ast); // get an AST with compression optimizations
	var final_code = jsprocessor.gen_code(ast); // compressed code here
	return final_code;
}
bndlr.StaticFile.compressors.css = function(content){
	return cleancss.process(content);
}

//open a config
var	cfg = bndlr.open(__dirname+'/example.config.js');


cfg.css.global.files.forEach(function(file){
	var content = file.content;
	var minified = file.minified;
	console.log(file.uniqueFileName);
});

