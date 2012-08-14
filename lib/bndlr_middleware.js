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
	getHeaders(info);
	if(!info.headers || !info.headers["Content-Type"])
		throw new Error("Missing Content-Type header");

	if(config){
		//see if the config has an object defining the type. eg: css, js, html...
		var type = config[info.type];
		if(type){
			var bndl = type[info.filename];;

			if(bndl){
				res.writeHead(200,info.headers);
				bndl.writeTo(res, !!info.min, function(){
					res.end();
				});
				return;
			}
		}
	}
	// send non-bundled files
	writeFile(res, info, next);
};
function getHeaders(info){
	return (
		exports.getHeaders[info.type]
			|| exports.getHeaders.text
			|| function(info){ info.headers = {"Content-Type":"text/plain"}; }
		)(info);
}
function writeFile(res, info, next){
	var filePath = bndlr.getFilePath(info);

	if(info.canCompress === false){
		// stream
		var stream = fs.createReadStream(filePath);
		stream.on('error', function(err){
			if(err.code=="ENOENT")
				next();
			else
				res.send(500);
		});
		res.writeHead(200,info.headers);
		stream.pipe(res);
		return;
	}

	fs.readFile(filePath, 'utf8', function (err, data) {
		if (err) return next();

		if(info.min){
			var compressor = bndlr.StaticFile.compressors[info.type];
			if(compressor){
				try{
					data = compressor(data);
				}
				catch(e){
					res.writeHead(500,info.headers);
					if(bndlr.StaticFile.onWrite.error)
						bndlr.StaticFile.onWrite.error(e, info);
					else res.write(e);
					return res.end();
				}
			}
		}
		res.writeHead(200,info.headers);
		res.write(data);
		res.end();
	});
}
exports.getHeaders = {
	js: function(info){ info.headers = {"Content-Type": "application/javascript"}; },
	css: function(info){ info.headers = {"Content-Type": "text/css"}; },
	html: function(info){ info.headers = {"Content-Type": "text/html"}; },
	swf: function(info){
		info.canCompress = false;
		info.headers = {"Content-Type": "application/x-shockwave-flash"};
	},
	img: function(info){
		info.canCompress = false;
		info.headers = {"Content-Type": "image/"+info.ext.substr(1)};
	},
	text: function(info){ info.headers = {"Content-Type": "text/plain"}; },
	font: function(info){
		info.canCompress = false;
		info.headers = {
			"Access-Control-Allow-Origin": "*",
			"Content-Type":"font/"+info.ext.substr(1)
		};
	}
};

//Examines the request to determine if it the middleware should respond.
//returns the unful info it finds
exports.inspect = function(req){
	var m = /^\/([a-z]+)\/(.+)/.exec(req.url.substr(bndlr.staticDir.length+1)); //add one for the leading slash
	if(!m) return null;

	var min = false,
		ext = '',
		//look for url ending in .min[.ext]
		filename = m[2].replace(/(\.min)?(\.[a-z]+)?(\?.+|$)/, function(){
			min=!!arguments[1];
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
	if(fs.existsSync(configPath))
		return bndlr.open(configPath);
};

