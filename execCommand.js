var sys = require('sys'),
exec = require('child_process').exec;

execCommand = function (){

}

execCommand.prototype.execute = function(cmd, callback) {
	var child = exec(cmd, (error, stdout, stderr) => {
		if (error || stderr) {
			callback({status: false, response: error})
		} else {
			callback({status: true, stdout})
		}
	});
}

module.exports = new execCommand();