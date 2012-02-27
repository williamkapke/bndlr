var fs = require('fs'),
	path = require('path'),
	compressors = {
		js: function(content){
			return '/*pretend minified*/\n'+content;
		},
		css: function(content){
			return '/*pretend minified*/\n'+content;
		}
	}
	;


function StaticFile(fullpath){
	var bytes,
		content,
		unique,
		md5,
		minified
		;
	Object.defineProperties(this, {
		"type": { value: path.extname(fullpath).substr(1), writable:true, enumerable: true },
		"exists": { value: path.existsSync(fullpath), enumerable: true },
		"fullpath": { value: fullpath, enumerable: true },
		"bytes": {
			get: function(){
				return bytes||(bytes = this.exists? fs.readFileSync(fullpath) : new Buffer(0));
			}
		},
		"content": {
			get: function() {
				if (!exists) return '';
				if (content) return content;
				var bytes = this.bytes;
				//			if (this.hasUTF8ByteOrderMark) {
				//				return (content = Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3));
				//			}
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
		"md5": {
			enumerable: true,
			get: function(){
				if (!md5) {
					if (!this.bytes.length)
						return md5 = "d41d8cd98f00b204e9800998ecf8427e";//empty file: no need to compute a predictable result!

					var hash = require('crypto').createHash('md5');
					hash.update(this.bytes);
					md5 = hash.digest('hex');
				}
				return md5;
			}
		},
		"minified": {
			get: function(){
				if (!this.exists || this.content === '') return '';
				return minified || (minified = (compressors[this.type]||function(a){return a;})(this.content));
			}
		}
	});
}
StaticFile.compressors = compressors;

Object.defineProperties(StaticFile.prototype, {
	"uniqueFileNamer": {
		writable: true,
		value: function(){
			var dir = path.dirname(this.fullpath);
			var filename = path.basename(this.fullpath, path.extname(this.fullpath));
			return dir + '/' + filename + '_' + this.md5 + '.' + this.type;
		}
	}
});
module.exports = StaticFile;