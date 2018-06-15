


var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var pdfToSvg = require('./pdfToSvg');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


app.post('/converttopdf', (req, res) => {
	pdfToSvg.init("book1.pdf");

	fs.writeFile("test.svg", req.body.svg);
	pdfToSvg.startConversion(req.body.svg);
	res.send('working');
});


app.listen(3001, () => console.log('server started at localhost:3001'));