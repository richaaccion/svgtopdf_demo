var fs = require('fs'),
path = require('path'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit'),
execCommand = require('./execCommand'),
config = require('./config/app.config.json'),
domParser = require('dom-parser'),
url = require('url'),
atob = require('atob');


var pdfToSvg = function() {
}

pdfToSvg.prototype.init = function(bookName) {
	this.coverPageFilePath = this.getCoverPageFile(); // path where cover page will be saved.
	this.bookName = bookName; // predefined ebook to which cover page needs to be appended.
	this.eBookDir = config.eBookDir; // existing ebook directory where predefined books are saved
	this.eBookNameFull = this.getEbookName(); // full file path of final ebook
}

pdfToSvg.instance = null;

/*pdfToSvg.prototype.startConversion = function(svgTag, callback) {
	// create pdf and set write stream
	this.generatePDF();

	this.convertToPdf(svgTag, false);

	// close the document
	this.doc.end();

	// once cover page is created, append it to existing prebook
	this.appendCoverToBook(callback);
}*/

/*pdfToSvg.prototype.convertToPdf = function(svgTag, addImgFlag = false) {
	SVGtoPDF(this.doc, svgTag, 0, 0, {preserveAspectRatio: "true", fontCallback: function() {
		return "sfns_displayregular";
	}});

	if (addImgFlag) {
		this.doc.addPage();	
	}
}*/

/*pdfToSvg.prototype.generatePDF = function() {
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

/*pdfToSvg.prototype.readSVG = function(svgFilename) {
	if (fs.existsSync(svgFilename)) {
		return fs.readFileSync(svgFilename).toString();
	} 
	return null;
}
*/

pdfToSvg.prototype.appendCoverToBook = function(callback) {
	var command = this.getConversionCommand();
	var self = this;
	execCommand.execute(command, (res) => {
		callback(path.join(this.baseUrl, self.eBookName));
	});
}

pdfToSvg.prototype.getCoverPageFile = function() {
	return path.join(__dirname, config.pdfOutDir, config.coverPagePrefix + Date.now().toString()+".pdf");
}

pdfToSvg.prototype.getEbookName = function() {
	this.eBookName = config.eBookPrefix + Date.now().toString() + ".pdf";
	return path.join(__dirname, config.pdfOutDir, this.eBookName);
}

pdfToSvg.prototype.getConversionCommand = function() {
	return "pdftk " + this.coverPageFilePath + " " + path.join(__dirname, this.eBookDir, this.bookName + " cat output " + this.eBookNameFull);
}

/*var children = [];
var allowedNodes = ['image', 'text', 'svg', 'circle'];

function getChildren(node) {
	console.log(node);
	if (node.childNodes && node.childNodes.constructor === Array && node.childNodes.length >= 1) {
		node.childNodes.map(function(childNode) {
			getChildren(childNode)
		})
	} else if (allowedNodes.indexOf(node.nodeName) !== -1) { // push only known elements.. 
		console.log("no children..");
		children.push(node);
	}
}*/

pdfToSvg.prototype.createCover = function(request, callback) {
	var svgElement = request.body.svg;
	this.baseUrl = request.protocol + "://" + request.headers.host;
	var svgElementDetails = getSvgElements(svgElement);
	if (svgElementDetails) {
		this.generateDocument(svgElementDetails, callback);	
	} else {
		callback(false);
	}
	
}

pdfToSvg.prototype.generateDocument = function(svgElementDetails, callback) {
	// generate pdf with details
	var pdfDoc = new PDFDocument;
	pdfDoc.pipe(fs.createWriteStream(this.coverPageFilePath));
	this.insertSvgToPdf(pdfDoc, svgElementDetails);
	pdfDoc.end();

	this.appendCoverToBook(callback);
}

pdfToSvg.prototype.insertSvgToPdf = function(pdfDoc, svgElementDetails) {
	pdfDoc.font(svgElementDetails.titleElement.font).fontSize(svgElementDetails.titleElement.fontSize).text(svgElementDetails.titleElement.text), svgElementDetails.titleElement.coordinates[0], svgElementDetails.titleElement.coordinates[1];
	pdfDoc.font(svgElementDetails.authorElement.font).fontSize(svgElementDetails.authorElement.fontSize).text(svgElementDetails.authorElement.text), svgElementDetails.authorElement.coordinates[0], svgElementDetails.authorElement.coordinates[1];
	pdfDoc.image(svgElementDetails.imageElement.source, svgElementDetails.imageElement.coordinates[0], svgElementDetails.imageElement.coordinates[1], svgElementDetails.imageElement.dimensions);
}

function getSvgElements(svgElement) {
	var parser = new domParser();
	var doc = parser.parseFromString(svgElement, "application/xml");
	var titleElement = doc.getElementById('title');
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
	
	return response;
}

// check if font file is present else return default font file
function getFontFile(fontName) {
	return (fs.existsSync(path.join(config.fontDir, fontName+'.ttf'))) ? (path.join(config.fontDir, fontName + '.ttf')) : (path.join(config.fontDir, config.defaultFont + '.ttf'));
}

// ------------------------------------------------

pdfToSvg.getInstance = function(){
    if(this.instance === null){
        this.instance = new pdfToSvg();
    }
    return this.instance;
}

module.exports = pdfToSvg.getInstance();