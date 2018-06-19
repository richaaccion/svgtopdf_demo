


var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var path = require('path');
var pdfToSvg = require('./pdfToSvg');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('assets/output'))

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.post('/converttopdf', (req, res) => {
	pdfToSvg.init("book1.pdf");
	pdfToSvg.startConversion(req.body.svg, function(response) {
		var file = fs.createReadStream(response);
		var stat = fs.statSync(response);
		res.setHeader('Content-Length', stat.size);
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
		file.pipe(res);
	});
});

app.post('/createcover', (req, res) => {
	pdfToSvg.init("book1.pdf");
	pdfToSvg.createCover(req, function(createCoverRes){
		res.send((createCoverRes) ? (createCoverRes) : ("error"));
	});
});


app.listen(3002, () => console.log('server started at localhost:3001'));