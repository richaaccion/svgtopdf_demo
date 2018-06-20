var fs = require('fs'),
path = require('path'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit'),
execCommand = require('./execCommand'),
config = require('./config/app.config.json'),
domParser = require('dom-parser'),
url = require('url'),
atob = require('atob');


var svgToPdf = function() {
}

svgToPdf.prototype.init = function(bookName) {
	this.coverPageFilePath = this.getCoverPageFile(); // path where cover page will be saved.
	this.bookName = bookName; // predefined ebook to which cover page needs to be appended.
	this.eBookDir = config.eBookDir; // existing ebook directory where predefined books are saved
	this.eBookNameFull = this.getEbookName(); // full file path of final ebook
}

svgToPdf.instance = null;

/*svgToPdf.prototype.startConversion = function(svgTag, callback) {
	// create pdf and set write stream
	this.generatePDF();

	this.convertToPdf(svgTag, false);

	// close the document
	this.doc.end();

	// once cover page is created, append it to existing prebook
	this.appendCoverToBook(callback);
}*/

/*svgToPdf.prototype.convertToPdf = function(svgTag, addImgFlag = false) {
	SVGtoPDF(this.doc, svgTag, 0, 0, {preserveAspectRatio: "true", fontCallback: function() {
		return "sfns_displayregular";
	}});

	if (addImgFlag) {
		this.doc.addPage();	
	}
}*/

/*svgToPdf.prototype.generatePDF = function() {
	try {
		this.doc = new PDFDocument({
			size: [155, 241],
			margins : {
				top: 0, 
				bottom: 0,
				left: 0,
				right: 0
			},
			layout: 'portrait', 
		});
		stream = fs.createWriteStream(this.coverPageFilePath);	

		stream.on('finish', function() {});
		stream.on('error', function(err) {console.log(err)});
		this.doc.pipe(stream);	
	} catch(err) {
		console.log(err);
	}
	
}*/

/*svgToPdf.prototype.readSVG = function(svgFilename) {
	if (fs.existsSync(svgFilename)) {
		return fs.readFileSync(svgFilename).toString();
	} 
	return null;
}
*/

svgToPdf.prototype.appendCoverToBook = function(callback) {
	var command = this.getConversionCommand();
	var self = this;
	execCommand.execute(command, (res) => {
		callback(url.resolve(this.baseUrl, self.eBookName));
	});
}

svgToPdf.prototype.getCoverPageFile = function() {
	return path.join(__dirname, config.pdfOutDir, config.coverPagePrefix + Date.now().toString()+".pdf");
}

svgToPdf.prototype.getEbookName = function() {
	this.eBookName = config.eBookPrefix + Date.now().toString() + ".pdf";
	return path.join(__dirname, config.pdfOutDir, this.eBookName);
}

svgToPdf.prototype.getConversionCommand = function() {
	return "pdftk " + this.coverPageFilePath + " " + path.join(__dirname, this.eBookDir, this.bookName + " cat output " + this.eBookNameFull);
}

var children = [];
var allowedNodes = ['image', 'text', 'circle'];

function getChildren(node) {
	if (node.childNodes && node.childNodes.constructor === Array && node.childNodes.length >= 1) {
		// if nodeName is text, do not traverse the object even if childNodes are present.
		if (node.nodeName === "text") {
			children.push(node);
		} else {
			node.childNodes.map(function(childNode) {
				getChildren(childNode)
			})	
		}
	} else if (allowedNodes.indexOf(node.nodeName) !== -1) { // push only known elements.. 
		children.push(node);
	}
}

svgToPdf.prototype.createCover = function(request, callback) {
	var svgElement = request.body.svg;
	this.baseUrl = request.protocol + "://" + request.headers.host;
	// var svgElementDetails = getSvgElements(svgElement);
	var pdfDoc = new PDFDocument;
	pdfDoc.pipe(fs.createWriteStream(this.coverPageFilePath));
	getSvgElements(svgElement, pdfDoc);
	pdfDoc.end();

	this.appendCoverToBook(callback);

	/*if (svgElementDetails) {
		this.generateDocument(svgElementDetails, callback);	
	} else {
		callback(false);
	}*/
	
}

svgToPdf.prototype.generateDocument = function(svgElementDetails, callback) {
	// generate pdf with details
	var pdfDoc = new PDFDocument({
		size: [155, 241],
		margins : {
			top: 0, 
			bottom: 0,
			left: 0,
			right: 0
		},
		layout: 'portrait', 
	});
	pdfDoc.pipe(fs.createWriteStream(this.coverPageFilePath));
	this.insertSvgToPdf(pdfDoc, svgElementDetails);
	pdfDoc.end();

	this.appendCoverToBook(callback);
}

svgToPdf.prototype.insertSvgToPdf = function(pdfDoc, svgElementDetails) {
	pdfDoc.font(svgElementDetails.titleElement.font).fontSize(svgElementDetails.titleElement.fontSize).text(svgElementDetails.titleElement.text), svgElementDetails.titleElement.coordinates[0], svgElementDetails.titleElement.coordinates[1];
	pdfDoc.font(svgElementDetails.authorElement.font).fontSize(svgElementDetails.authorElement.fontSize).text(svgElementDetails.authorElement.text), svgElementDetails.authorElement.coordinates[0], svgElementDetails.authorElement.coordinates[1];
	pdfDoc.image(svgElementDetails.imageElement.source, svgElementDetails.imageElement.coordinates[0], svgElementDetails.imageElement.coordinates[1], svgElementDetails.imageElement.dimensions);
}

var shapeArr = ["circle", "rect", "polygon"];

function isShape(nodeName) {
	return shapeArr.indexOf(nodeName) !== -1;
}

function getSvgElements(svgElement, pdfDoc) {
	var parser = new domParser();
	var doc = parser.parseFromString(svgElement, "application/xml");

	var svgElem = doc.getElementsByTagName("svg");
	children = [];
	getChildren(svgElem[0]);

	children.map((node) => {
		var elemDetails = {
			xCoordinate: parseInt(node.getAttribute('x') || node.getAttribute('cx')),
			yCoordinate: parseInt(node.getAttribute('y') || node.getAttribute('cy')),
			height: parseInt(node.getAttribute('height')) || 10,
			width: parseInt(node.getAttribute('width')) ||10,
			text: node.innerHTML,
			font: getFontFile(node.getAttribute('font-family')) || getFontFile('default'),
			fontSize: parseInt(node.getAttribute('font-size')) || 15,
			fillColor: node.getAttribute('fill') || "#000",
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
			elemDetails.source = node.getAttribute('xlink:href') || node.getAttribute('href') || path.join(config.svgImgDir, config.defaultImg);
		}

		node.nodeName = node.nodeName || "text";

		fillPdf(elemDetails, pdfDoc);
	})


	

	/*var titleElement = doc.getElementById('title');
	var authorElement = doc.getElementById('author');
	var imageElement = doc.getElementById('author_img');
	var titleFont = titleElement.getAttribute('font-family') || 'default';
	var authorFont = authorElement.getAttribute('font-family') || 'default';

	if (titleElement && authorElement && imageElement) {
		var response = {
			titleElement: {
				font: getFontFile(titleFont),
				fontSize: titleElement.getAttribute('font-size') || 14,
				text: titleElement.innerHTML || 'Demo text',
				coordinates: [parseInt(titleElement.getAttribute('x')), parseInt(titleElement.getAttribute('y'))]
			},
			authorElement: {
				font: getFontFile(authorFont),
				fontSize: authorElement.getAttribute('font-size') || 14,
				text: authorElement.innerHTML || 'Demo text',
				coordinates: [parseInt(authorElement.getAttribute('x')), parseInt(authorElement.getAttribute('y'))] 
			},
			imageElement: {
				source: imageElement.getAttribute('href') || path.join(config.svgImgDir, config.defaultImg),
				coordinates: [parseInt(imageElement.getAttribute('x')) || 50, parseInt(imageElement.getAttribute('y') || 150)],
				dimensions: {width: parseInt(imageElement.getAttribute('width')) || 50, height: parseInt(imageElement.getAttribute('height')) || 50}
			}
		}
	} else {
		response = false;
	}

	return response;*/
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
		pdfDoc.image(elemDetails.source, elemDetails.xCoordinate, elemDetails.yCoordinate, {width: elemDetails.width, height: elemDetails.height});
	} else {
		pdfDoc.font(elemDetails.font).fontSize(elemDetails.fontSize).fillColor(elemDetails.fillColor).text(elemDetails.text), elemDetails.xCoordinate, elemDetails.yCoordinate;
	}
}

// check if font file is present else return default font file
function getFontFile(fontName) {
	return (fs.existsSync(path.join(config.fontDir, fontName+'.ttf'))) ? (path.join(config.fontDir, fontName + '.ttf')) : (path.join(config.fontDir, config.defaultFont + '.ttf'));
}

// ------------------------------------------------

svgToPdf.getInstance = function(){
    if(this.instance === null){
        this.instance = new svgToPdf();
    }
    return this.instance;
}

module.exports = svgToPdf.getInstance();