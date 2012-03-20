var fs = require('fs'),
	path = require('path'),
	compressors = {}
	allFiles = {}
	;


function StaticFile(fullpath){
	if(allFiles[fullpath])
		return allFiles[fullpath];
	else allFiles[fullpath] = this;

	var bytes,
		content,
		md5,
		minified
		;
	Object.defineProperties(this, {
		"type": { value: path.extname(fullpath).substr(1), writable:true, enumerable: true },
		"exists": { value: path.existsSync(fullpath), enumerable: true },
		"fullpath": { value: fullpath, enumerable: true },
		"bytes": {
			get: function(){
				if(bytes) return bytes;
				return (bytes = this.exists? fs.readFileSync(fullpath) : new Buffer(0));
			}
		},
		"content": {
			get: function() {
				if (!this.exists) return '';
				if (content) return content;
				var bytes = this.bytes;

				//may need to compensate for BOM here

				return (content = bytes.toString());
			}
		},
		//gets a unique filename for this file
		"uniqueName": {
			enumerable: true,
			get: function(){
				return this.uniqueNamer();
			}
		},
		//gets a unique filename for this file when minified
		"uniqueMinName": {
			enumerable: true,
			get: function(){
				return this.uniqueMinNamer();
			}
		},
		"md5": {
			enumerable: true,
			get: function(){
				if (md5) return md5;
				var bytes = this.bytes;
				if (!bytes.length)
					return "d41d8cd98f00b204e9800998ecf8427e";//empty file: no need to compute a predictable result!

				var hash = require('crypto').createHash('md5');
				hash.update(bytes);
				return (md5 = hash.digest('hex'));
			}
		},
		"minified": {
			get: function(){
				if (!this.exists || this.content === '') return '';
				if(minified) return minified;
				var compressor = compressors[this.type];
				return (minified = compressor? compressor(this.content) : this.content);
			}
		},
		"watch": {
			value: function(){
				fs.watchFile(fullpath, {persistent: false, interval:1000}, function(curr, prev){
					if(+curr.mtime!=+prev.mtime)
						reset();
				})
			}
		}
	});
	function reset(){
		bytes = undefined;
		md5 = undefined;
		content = undefined;
		minified = undefined;
	}
	if(this.exists && StaticFile.watch)
		this.watch();
}
Object.defineProperties(StaticFile, {
	"versionable": {
		value: ['js', 'css', 'swf', 'htm', 'html']
	},
	"compressors": {
		value: compressors
	},
	"watch": {
		writable: true,
		value: false
	},
	"onWrite": {
		value: {
			missingFile: function(file){
				if(file.type=="js" || file.type=="css")
					this.write("\n/*#### FILE NOT FOUND: " +file.fullpath+ "####*/\n");
				if(file.type=="js")
					this.write("console.error('Missing Static File: "+file.fullpath+"');\n");
				if(file.type=="js" || file.type=="css")
					this.write('\n');
			},
			minificationError: function writeError(e, file){
				if(file.type=="js" || file.type=="css")
					this.write("/*#### ERROR ####*/\n");
				if(file.type=="js")
					this.write("console.error('"+e.message+"',"+JSON.stringify(e)+");\n");
				if(file.type=="js" || file.type=="css")
					this.write('\n');
			},
			fileStart: function(file){
				var env = process.env.NODE_ENV;
				if(env !== 'production' && (file.type=="js" || file.type=="css"))
					this.write("\n/* "+file.fullpath+"' */\n");
			}
		}
	}
});

Object.defineProperties(StaticFile.prototype, {
	"uniqueNamer": {
		writable: true,
		value: function(){
			var filename = path.basename(this.fullpath),
				ext = path.extname(this.fullpath);
			filename = filename.replace(/(\.[a-z]+)$/,'');

			if(this.isVersionable)
				return filename.toLowerCase() +'.'+ this.md5 + (ext||('.'+this.type));
			return filename.toLowerCase() + (ext||('.'+this.type));
		}
	},

	//generates a unique filename for this file when minified
	"uniqueMinNamer": {
		writable: true,
		value: function(){
			var filename = path.basename(this.fullpath),
				ext = path.extname(this.fullpath);
			filename = filename.replace(/(\.[a-z]+)$/,'');

			if(this.isVersionable)
				return filename.toLowerCase() +'.'+ this.md5 +'.min'+ (ext||('.'+this.type));
			return filename.toLowerCase() +'.min'+ (ext||('.'+this.type));;
		}
	},
	"isVersionable": {
		get: function(){
			return !!~StaticFile.versionable.indexOf(this.type);
		}
	},

	"writeTo": {
		enumerable: true,
		value: function(stream, minified, callback){
			var onWrite = StaticFile.onWrite,
				events = Object.getOwnPropertyNames(onWrite);

			events.forEach(function(event){
				stream.on(event, onWrite[event]);
			});


			if(!this.exists){
				stream.emit("missingFile", this);
				callback();
				return;
			}
			stream.emit("fileStart", this);
			if(minified){
				try{
					var content = this.minified;
				}
				catch(e){
					stream.emit("minificationError", e, this);
					callback();
					return;
				}
			}
			else{
				var content = this.content;
			}
			stream.once('drain', function fileEnd(){
				stream.emit("fileEnd", this);
				callback();
			});
			stream.write(content);
			return;
		}
	},

	"saveTo": {
		value: function(dir, minified, callback){
			var destination = path.join(dir, minified? this.uniqueMinName : this.uniqueName),
				writer = fs.createWriteStream(destination);

			this.writeTo(writer, !!minified, function(){
				writer.on('close', callback)
				writer.end();
				writer.destroySoon();
			});
		}
	}
});
module.exports = StaticFile;