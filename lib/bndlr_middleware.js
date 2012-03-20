var bndlr = require('./bndlr'),
	path = require('path'),
	fs = require('fs')
	;

exports = module.exports = function bndlr_middleware(req, res, next){
	if(req.method != 'GET'){
		return next();
	}
	//match urs like /account/js/anyhting
	var info = exports.inspect(req);
	if(!info){
		return next();
	}
	if(!info.type || !info.filename)
		throw new Error("inspect must return an object with type and filename");
	info.url = req.url;

	var config = exports.getConfig(info);
	if(config){
		var bndl = config[info.type][info.filename];;

		if(bndl){
			res.writeHead(200,{"Content-Type":contentType(info)});
			bndl.writeTo(res, !!info.min, function(){
				res.end();
			});
			return;
		}
	}
	// send non-bundled files
	writeFile(res, info, next);
};
function contentType(info){
	return (
			exports.contentTypes[info.type]
			|| exports.contentTypes.text
			|| function(){ return "text/plain"; }
		)(info);
}
function writeFile(res, info, next){
	var filePath = bndlr.getFilePath(bndlr.webroot +'/'+ bndlr.staticDir, info.type, info.filename+(info.ext||''));
	fs.readFile(filePath, 'utf8', function (err, data) {
		if (err) return next();

		if(info.min){
			var compressor = bndlr.StaticFile.compressors[type];
			if(compressor){
				try{
					data = compressor(data);
				}
				catch(e){
					res.writeHead(500,{"Content-Type":contentType(info)});
					if(bndlr.StaticFile.onWrite.error)
						bndlr.StaticFile.onWrite.error(e, info);
					else res.write(e);
					return res.end();
				}
			}
		}
		res.writeHead(200,{"Content-Type":contentType(info)});
		res.write(data);
		res.end();
	});
}
exports.contentTypes = {
	js: function(){ return "application/javascript"; },
	css: function(){ return "text/css"; },
	html: function(){ return "text/html"; },
	swf: function(){ return "application/x-shockwave-flash"; },
	img: function(info){
		var ext = path.extname(info.filename).substr(1);
		return "image/"+ext;
	},
	text: function(){ return "text/plain"; }
};

//Examines the request to determine if it the middleware should respond.
//returns the unful info it finds
exports.inspect = function(req){
	var m = /^\/([a-z]+)\/(.+)/.exec(req.url.substr(bndlr.staticDir.length+1)); //add one for the leading slash
	if(!m) return null;

	var min = false,
		ext = '',
		//look for url ending in .min[.ext]
		filename = m[2].replace(/(\.min)(\.[a-z]+)?(\?.+|$)/, function(){
			min=true;
			ext=arguments[2];
			return "";
		});

	return {
		type: m[1],
		filename: filename,
		ext: ext,
		min: min
	};
};

//gets the config needed for the
exports.getConfig = function(info){
	var configPath = path.join(bndlr.webroot, bndlr.staticDir, bndlr.configName);
	if(path.existsSync(configPath))
		return bndlr.open(configPath);
};

