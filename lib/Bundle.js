
var path = require("path"),
	fs = require('fs'),
	StaticFile = require('./StaticFile')
	;

function Bundle(configdir, type, filename, files){
	var self = this;
	files = files.slice(0)

	Object.defineProperties(this, {
		"configdir": { value: configdir, enumerable: true },
		"type": { value: type, enumerable: true, configurable: true },
		"filename": { value: filename, enumerable: true, configurable: true },
		"files": { get: function(){ return files.slice(0); }, enumerable: true },
		"references": { value: [], enumerable: true },
		"bytes": {
			enumerable: true,
			get: function(){
				var offset = 0,
					totalBytes = 0,
					items = [];

				files.forEach(function(file){
					if (!file.exists) return;
					var bytes = file.bytes;
					items.push(bytes);
					totalBytes += bytes.length;
				});

				var bytes = new Buffer(totalBytes);
				items.forEach(function(bytes2){
					bytes2.copy(bytes, offset);
					offset += bytes2.length;
				});
				return bytes;
			}
		},
		"md5": {
			enumerable: true,
			get: function(){
				if (!files.length)
					return "d41d8cd98f00b204e9800998ecf8427e";//empty file: no need to compute a predictable result!

				var hash = require('crypto').createHash('md5');
				files.forEach(function(file){
					if (!file.exists) return;
					var bytes = file.bytes;
					hash.update(bytes);
				});
				return hash.digest('hex');
			}
		},
		"content": {
			enumerable: true,
			get: function() {
				return this.bytes.toString();
			}
		},
		//gets a unique filename for this bundle
		"uniqueName": {
			enumerable: true,
			get: function(){
				return this.uniqueNamer();
			}
		},
		//gets a unique filename for this bundle when minified
		"uniqueMinName": {
			enumerable: true,
			get: function(){
				return this.uniqueMinNamer();
			}
		},
		"minified": {
			enumerable: true,
			get: function() {
				var contents = [];
				files.forEach(function(file){
					contents.push(file.minified);
				});
				return contents.join('');
			}
		}

	});

	files.forEach(function(item){
		if(item instanceof Bundle)
			item.references.push(self);
	});
}
Object.defineProperties(Bundle, {
	"onWrite": {
		value: {}
	}
});
Object.defineProperties(Bundle.prototype, {
	//generates a unique filename for this bundle
	"uniqueNamer": {
		writable: true,
		value: function(){
			return [this.filename.toLowerCase(), this.md5.toUpperCase(), this.type].join('.');
		}
	},

	//generates a unique filename for this bundle when minified
	"uniqueMinNamer": {
		writable: true,
		value: function(){
			return [this.filename.toLowerCase(), this.md5.toUpperCase(), 'min', this.type].join('.');
		}
	},

	"writeTo": {
		enumerable: true,
		value: function(stream, minified, callback){
			wireListeners(Bundle, stream);
			wireListeners(StaticFile, stream);

			_writeTo.call(this, stream, minified, null, callback);
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


function wireListeners(obj, stream){
	var onWrite = obj.onWrite,
		events = Object.getOwnPropertyNames(onWrite);

	events.forEach(function(event){
		stream.on(event, onWrite[event]);
	});
}
function _writeTo(stream, minified, parent, callback){
	var self = this,
		files = this.files,
		file;
	stream.emit('bundleStart', self, minified, parent);

	function writeFile(){
		file = files.pop();
		if(!file){
			stream.emit('bundleEnd', self, minified, parent);
			if(callback)
				process.nextTick(callback);
			return;
		}
		function fileEnd(){
			stream.emit("fileEnd", file);
			writeFile();
		}

		//allowed bundles to reference other bundles
		if(file instanceof Bundle){
			_writeTo.call(file, stream, minified, self, writeFile);
		}
		else {
			if(!file.exists){
				stream.emit("missingFile", file);
				fileEnd();
				return;
			}
			stream.emit("fileStart", file);
			if(minified){
				try{
					var content = self.minified;
				}
				catch(e){
					debugger;
					stream.emit("minificationError", e, file);
					fileEnd();
					return;
				}
			}
			else{
				var content = self.content;
			}
			stream.once('drain', fileEnd);
			stream.write(content);
			return;
		}
	}
	writeFile();
}

module.exports = Bundle;