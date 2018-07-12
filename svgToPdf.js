var fs = require('fs'),
path = require('path'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit'),
execCommand = require('./execCommand'),
config = require('./config/app.config.json'),
domParser = require('dom-parser'),
url = require('url'),
atob = require('atob'),
request = require('request');


var svgToPdf = function() {
}

var svgElemArr = [];
var allowedNodes = ['image', 'text', 'circle', 'rect'];
var dpi = 0;

svgToPdf.prototype.createCover = function(req, callback) {
	var coverPdfName = config.coverPagePrefix + Date.now().toString()+".pdf";
	var coverPdfPath = path.join(__dirname, config.pdfOutDir, coverPdfName);
	dpi = req.body.dpi;

	var svgElement = req.body.svg;
	traverseSvgElements(svgElement);

	generatePdf([796.5, 590.4], coverPdfPath).then(function(pdfDoc){
		// extract svg tag

		console.log(svgElemArr);
		writeSvgToPdf(pdfDoc).then(function(){ // traverse through children and write in pdf document
			var baseUrl = req.protocol + "://" + req.headers.host;
			callback(url.resolve(baseUrl, coverPdfName));
		});
	});
}

svgToPdf.prototype.createEbook1 = function(req, callback) {
	var eBookCoverName = config.eBookCoverPrefix + Date.now().toString()+".pdf";;
	var eBookCoverPath = path.join(__dirname, config.pdfOutDir, eBookCoverName);

	var self = this;
	var svgElement = req.body.svg;
	traverseSvgElements(svgElement); // will set all children elements
	generatePdf([396, 612], eBookCoverPath).then(function(pdfDoc){
		console.log(svgElemArr);
		// extract svg
		writeSvgToPdf(pdfDoc).then(function(){ // traverse through children and write in pdf document
			var baseUrl = req.protocol + "://" + req.headers.host;
			self.appendCoverToBook(eBookCoverPath, path.join(__dirname, config.eBookDir, "book1.pdf"), baseUrl, callback);
		});
	});
}

// will go in library
function generatePdf(dimensions, pdfFilePath) {
	return new Promise(function(resolve, reject){
		var pdfDoc = new PDFDocument({
			size: dimensions,
			layout: 'portrait', 
		});
		pdfDoc.pipe(fs.createWriteStream(pdfFilePath));
		resolve(pdfDoc);
	});
}

// will go in library
function traverseSvgElements(svgElement) {
	var parser = new domParser();
	var doc = parser.parseFromString(svgElement, "application/xml");

	var svgElem = doc.getElementsByTagName("svg");
	console.log(svgElem[0].getAttribute("viewBox"));
	svgElemArr = [];
	setSvgElemArr(svgElem[0]);
}

// will go in library
function setSvgElemArr(node) {
	if (node.childNodes && node.childNodes.constructor === Array && node.childNodes.length >= 1) {
		// if nodeName is text, do not traverse the object even if childNodes are present.
		if (node.nodeName === "text") {
			svgElemArr.push(node);
		} else {
			node.childNodes.map(function(childNode) {
				setSvgElemArr(childNode)
			})	
		}
	} else if (allowedNodes.indexOf(node.nodeName) !== -1) { // push only known elements.. 
		svgElemArr.push(node);
	}
}

function writeSvgToPdf(pdfDoc) {
	return new Promise(function(resolve, reject) {
		var resolved = 0;
		svgElemArr.map((node, index) => {
			createPdfObject(node).then(function(elemDetails) { // async operation
				fillPdf(elemDetails, pdfDoc);
				resolved++;
				if (resolved === svgElemArr.length) {
					pdfDoc.end();
					resolve();
				}
			});
		});
	});
}

function createPdfObject(node) {
	return new Promise(function(resolve, reject) {
		var elemDetails = {
			xCoordinate: getPointsFromDpi(parseInt(node.getAttribute('x') || node.getAttribute('cx'))),
			yCoordinate: getPointsFromDpi(parseInt(node.getAttribute('y') || node.getAttribute('cy'))),
			height: parseInt(node.getAttribute('height')) || 10,
			width: parseInt(node.getAttribute('width')) ||10,
			text: node.innerHTML,
			font: getFontFile(node.getAttribute('font-family')) || getFontFile('default'),
			fontSize: parseInt(node.getAttribute('font-size')) || 15,
			fillColor: node.getAttribute('fill') || "#000",
			nodeName: "text"
		}

		if (isShape(node.nodeName)) {
			elemDetails.nodeType = "shape";
			elemDetails.shapeName = node.nodeName;

			if (node.getAttribute('stroke')) {
				elemDetails.strokeColor = node.getAttribute('stroke');
			}

			if (node.getAttribute('stroke-width')) {
				elemDetails.strokeWidth = parseInt(node.getAttribute('stroke-width'));
			}

			if (node.getAttribute('r')) {
				elemDetails.radius = parseInt(node.getAttribute('r'));
			}
		}

		if (node.nodeName === "image") {
			elemDetails.nodeType = "image";
			elemDetails.uri = node.getAttribute('xlink:href') || node.getAttribute('href');
			var localImgFilename = path.resolve(config.svgImgDir, config.imagePrefix + Date.now().toString() + path.extname(url.parse(elemDetails.uri).pathname));
			elemDetails.source = localImgFilename;
			downloadImage(elemDetails.uri, localImgFilename, function() {
				resolve(elemDetails);
			});
		} else {
			resolve(elemDetails);
		}	
	})
}

function getPointsFromDpi(pixelVal) {
	return (pixelVal / dpi * 72)
}

function fillPdf(elemDetails, pdfDoc) {
	if (elemDetails.nodeType === "shape") {
		switch(elemDetails.shapeName) {
			case 'circle':
				pdfDoc.circle(elemDetails.xCoordinate, elemDetails.yCoordinate, elemDetails.radius).lineWidth((elemDetails.strokeWidth) ? (elemDetails.strokeWidth) : (0)).fillAndStroke(elemDetails.fillColor, elemDetails.strokeColor || "black");
				break;
			case 'rect':
				pdfDoc.rect(elemDetails.xCoordinate, elemDetails.yCoordinate, elemDetails.width, elemDetails.height).lineWidth((elemDetails.strokeWidth) ? (elemDetails.strokeWidth) : (0)).fillAndStroke(elemDetails.fillColor, elemDetails.strokeColor || 'black');
				break;
		}
	} else if(elemDetails.nodeType === "image") {
		pdfDoc.image(elemDetails.source, elemDetails.xCoordinate, elemDetails.yCoordinate, {width: elemDetails.width, height: elemDetails.height, fit: [100, 100]});
	} else {
		pdfDoc.font(elemDetails.font).fontSize(elemDetails.fontSize).fillColor(elemDetails.fillColor).text(elemDetails.text, elemDetails.xCoordinate, elemDetails.yCoordinate);
	}
}

svgToPdf.prototype.appendCoverToBook = function(eBookCoverPath, eBookContentPath, baseUrl, callback) {
	var eBookName = config.eBookPrefix + Date.now().toString() + ".pdf";
	var eBookPath = path.join(__dirname, config.pdfOutDir, eBookName);


	var command = this.getConversionCommand(eBookCoverPath, eBookContentPath, eBookPath);
	execCommand.execute(command, (res) => {
		callback(url.resolve(baseUrl, eBookName));
	});
}

svgToPdf.prototype.getConversionCommand = function(eBookCoverPath, eBookContentPath, eBookPath) {
	return "pdftk " + eBookCoverPath + " " + eBookContentPath + " cat output " + eBookPath;
}

var shapeArr = ["circle", "rect", "polygon"];

function isShape(nodeName) {
	return shapeArr.indexOf(nodeName) !== -1;
}

// check if font file is present else return default font file
function getFontFile(fontName) {
	return (fs.existsSync(path.join(config.fontDir, fontName+'.ttf'))) ? (path.join(config.fontDir, fontName + '.ttf')) : (path.join(config.fontDir, config.defaultFont + '.ttf'));
}

function downloadImage(uri, filename, callback) {
  	request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(filename)).on('close', function() {
    	callback();
    });
  });
};

// ------------------------------------------------

svgToPdf.getInstance = function(){
    if(this.instance === null){
        this.instance = new svgToPdf();
    }
    return this.instance;
}

module.exports = new svgToPdf();