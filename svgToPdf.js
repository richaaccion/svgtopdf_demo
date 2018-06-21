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

var children = [];
var allowedNodes = ['image', 'text', 'circle', 'rect'];

/*svgToPdf.prototype.init = function(bookName) {
	this.coverPageFilePath = this.getCoverPageFile(); // path where cover page will be saved.
	this.bookName = bookName; // predefined ebook to which cover page needs to be appended.
	this.eBookDir = config.eBookDir; // existing ebook directory where predefined books are saved
	this.eBookNameFull = this.getEbookName(); // full file path of final ebook
	this.coverPageName = config.coverPagePrefix + Date.now().toString()+".pdf";
}*/


svgToPdf.prototype.createCover1 = function(req, callback) {
	var coverPdfName = config.coverPagePrefix + Date.now().toString()+".pdf";
	var coverPdfPath = path.join(__dirname, config.pdfOutDir, coverPdfName);

	var svgElement = req.body.svg;
	traverseSvgElements(svgElement);

	generatePdf([796.5, 590.4], coverPdfPath).then(function(pdfDoc){
		// extract svg tag
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
		// extract svg
		writeSvgToPdf(pdfDoc).then(function(){ // traverse through children and write in pdf document
			var baseUrl = req.protocol + "://" + req.headers.host;
			self.appendCoverToBook(eBookCoverPath, path.join(__dirname, config.eBookDir, "book1.pdf"), baseUrl, callback);
		});
	});
}

function writeSvgToPdf(pdfDoc) {
	return new Promise(function(resolve, reject) {
		var resolved = 0;
		children.map((node, index) => {
			createPdfObject(node).then(function(elemDetails) { // async operation
				fillPdf(elemDetails, pdfDoc);
				resolved++;
				if (resolved === children.length) {
					pdfDoc.end();
					resolve();
				}
			});
		});
	});
}


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

function traverseSvgElements(svgElement) {
	var parser = new domParser();
	var doc = parser.parseFromString(svgElement, "application/xml");

	var svgElem = doc.getElementsByTagName("svg");
	children = [];
	setSvgElemArr(svgElem[0]);
}

// svgToPdf.instance = null;

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


/*svgToPdf.prototype.getCoverPageFile = function() {
	console.log("coverpage name: ", this);
	return path.join(__dirname, config.pdfOutDir, this.coverPageName);
}*/

/*svgToPdf.prototype.getEbookName = function() {
	this.eBookName = config.eBookPrefix + Date.now().toString() + ".pdf";
	return path.join(__dirname, config.pdfOutDir, this.eBookName);
}*/







/*svgToPdf.prototype.createEbook = function(request, isCover, callback) {
	var svgElement = request.body.svg;
	this.baseUrl = request.protocol + "://" + request.headers.host;

	var sizeArr = (isCover) ? ([796.5, 590.4]) : ([396, 612]);
	var pdfDoc = new PDFDocument({
		size: sizeArr,
		layout: 'portrait', 
	});
	pdfDoc.pipe(fs.createWriteStream(this.coverPageFilePath));
	var self = this;
	getSvgElements(svgElement, pdfDoc, function() {
		pdfDoc.end();
		if (!isCover) {
			self.appendCoverToBook(callback);
		} else {
			callback(url.resolve(self.baseUrl, self.coverPageName));
		}
	});
}*/

/*svgToPdf.prototype.insertSvgToPdf = function(pdfDoc, svgElementDetails) {
	pdfDoc.font(svgElementDetails.titleElement.font).fontSize(svgElementDetails.titleElement.fontSize).text(svgElementDetails.titleElement.text), svgElementDetails.titleElement.coordinates[0], svgElementDetails.titleElement.coordinates[1];
	pdfDoc.font(svgElementDetails.authorElement.font).fontSize(svgElementDetails.authorElement.fontSize).text(svgElementDetails.authorElement.text), svgElementDetails.authorElement.coordinates[0], svgElementDetails.authorElement.coordinates[1];
	pdfDoc.image(svgElementDetails.imageElement.source, svgElementDetails.imageElement.coordinates[0], svgElementDetails.imageElement.coordinates[1], svgElementDetails.imageElement.dimensions);
}*/

var shapeArr = ["circle", "rect", "polygon"];

function isShape(nodeName) {
	return shapeArr.indexOf(nodeName) !== -1;
}

function createPdfObject(node) {
	return new Promise(function(resolve, reject) {
		var elemDetails = {
			xCoordinate: parseInt(node.getAttribute('x') || node.getAttribute('cx')),
			yCoordinate: parseInt(node.getAttribute('y') || node.getAttribute('cy')),
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



function setSvgElemArr(node) {
	if (node.childNodes && node.childNodes.constructor === Array && node.childNodes.length >= 1) {
		// if nodeName is text, do not traverse the object even if childNodes are present.
		if (node.nodeName === "text") {
			children.push(node);
		} else {
			node.childNodes.map(function(childNode) {
				setSvgElemArr(childNode)
			})	
		}
	} else if (allowedNodes.indexOf(node.nodeName) !== -1) { // push only known elements.. 
		children.push(node);
	}
}

function fillPdf(elemDetails, pdfDoc) {
	if (elemDetails.nodeType === "shape") {
		switch(elemDetails.shapeName) {
			case 'circle':
				pdfDoc.circle(elemDetails.xCoordinate, elemDetails.yCoordinate, elemDetails.radius).fill(elemDetails.fillColor || 'black').fillAndStroke(elemDetails.fillColor, elemDetails.strokeColor);
				break;
			case 'rect':
				pdfDoc.rect(elemDetails.xCoordinate, elemDetails.yCoordinate, elemDetails.height, elemDetails.width).fill(elemDetails.fillColor || 'black').fillAndStroke(elemDetails.fillColor, elemDetails.strokeColor);
				break;
		}
	} else if(elemDetails.nodeType === "image") {
		pdfDoc.image(elemDetails.source, elemDetails.xCoordinate, elemDetails.yCoordinate, {width: elemDetails.width, height: elemDetails.height, fit: [100, 100]});
	} else {
		pdfDoc.font(elemDetails.font).fontSize(elemDetails.fontSize).fillColor(elemDetails.fillColor).text(elemDetails.text), elemDetails.xCoordinate, elemDetails.yCoordinate;
	}
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