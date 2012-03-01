
var path = require("path")
	;

function Bundle(configpath, type, filename, files){
	var md5,
		self = this,
		unique,
		content;
	files = files.slice(0)

	Object.defineProperties(this, {
		"configpath": { value: configpath, enumerable: true },
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
				if (!md5) {
					if (!files.length)
						return md5 = "d41d8cd98f00b204e9800998ecf8427e";//empty file: no need to compute a predictable result!

					var hash = require('crypto').createHash('md5');
					hash.update(this.bytes);
					md5 = hash.digest('hex');
				}
				return md5;
			}
		},
		"content": {
			enumerable: true,
			get: function() {
				if (!this.exists) return '';
				if (content) return content;
				var bytes = this.bytes;
				return (content = bytes.toString());
			}
		},
		"uniqueFileName": {
			enumerable: true,
			get: function(){
				if (unique) return unique;
				return unique = this.uniqueFileNamer();
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
		},
		"writeTo": {
			enumerable: true,
			value: function(stream, minified){
				var files = this.files;
				files.forEach(function(file){
					if(file instanceof Bundle){
						file.writeTo(stream, minified);
					}
					else {
						if(file.exists){
							stream.emit("beforeContent", file);
							try{
								stream.write(minified? file.minified : file.bytes);
							}
							catch(e){
								stream.emit("error", e, file);
							}
							stream.emit("afterContent", file);
						}
						else {
							stream.emit("missingFile", file);
						}
					}
				});
			}
		}
	});

	files.forEach(function(item){
		if(item instanceof Bundle)
			item.references.push(self);
	});
}
Object.defineProperties(Bundle.prototype, {
	"exists": { value: true, enumerable: true },
	"uniqueFileNamer": {
		writable: true,
		value: function(){
			return path.join(this.type, this.filename + '_' + this.md5);
		}
	}
});
module.exports = Bundle;