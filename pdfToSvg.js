var fs = require('fs'),
path = require('path'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit'),
execCommand = require('./execCommand'),
config = require('./config/app.config.json'),
domParser = require('dom-parser'),
atob = require('atob');


var pdfToSvg = function() {
}

pdfToSvg.prototype.init = function(bookName) {
	this.coverPageFilePath = this.getCoverPageFile(); // path where cover page will be saved.
	this.bookName = bookName; // predefined ebook to which cover page needs to be appended.
	this.eBookDir = config.eBookDir; // existing ebook directory where predefined books are saved
	this.ebookName = this.getEbookName(); // full file path of final ebook
}

pdfToSvg.instance = null;

pdfToSvg.prototype.startConversion = function(svgTag, callback) {
	// create pdf and set write stream
	this.generatePDF();

	this.convertToPdf(svgTag, false);

	// close the document
	this.doc.end();

	// once cover page is created, append it to existing prebook
	this.appendCoverToBook(callback);
}

pdfToSvg.prototype.appendCoverToBook = function(callback) {
	var command = this.getConversionCommand();
	var self = this;
	execCommand.execute(this.getConversionCommand(), (res) => {
		callback(self.ebookName);
	});
}

pdfToSvg.prototype.convertToPdf = function(svgTag, addImgFlag = false) {
	SVGtoPDF(this.doc, svgTag, 0, 0, {preserveAspectRatio: "true", fontCallback: function() {
		return "sfns_displayregular";
	}});

	if (addImgFlag) {
		this.doc.addPage();	
	}
}


pdfToSvg.prototype.getCoverPageFile = function() {
	return path.join(__dirname, config.pdfOutDir, config.coverPagePrefix + Date.now().toString()+".pdf");
}

pdfToSvg.prototype.getEbookName = function() {
	return path.join(__dirname, config.pdfOutDir, config.eBookPrefix + Date.now().toString()+".pdf");
}

pdfToSvg.prototype.getConversionCommand = function() {
	return "pdftk " + this.coverPageFilePath + " " + path.join(__dirname, this.eBookDir, this.bookName + " cat output " + this.ebookName);
}

pdfToSvg.prototype.generatePDF = function() {
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
	
}

pdfToSvg.prototype.readSVG = function(svgFilename) {
	if (fs.existsSync(svgFilename)) {
		return fs.readFileSync(svgFilename).toString();
	} 
	return null;
}

var children = [];
var allowedNodes = ['image', 'text', 'svg', 'circle'];

pdfToSvg.prototype.createCover = function(svgElement, res) {
	var parser = new domParser();

	var doc = parser.parseFromString(svgElement, "image/svg+xml");
	var titleElement = doc.getElementById('title');
	var authorElement = doc.getElementById('author');
	var image = doc.getElementById('author_img');
	var titleFont = titleElement.getAttribute('font-family') || 'courier';
	var authorFont = authorElement.getAttribute('font-family') || 'courier';


	doc = new PDFDocument;
	doc.pipe(fs.createWriteStream(this.getEbookName()));
	
	doc.font('/home/richajoshi/backup/smart-agents/image_example/font/font/font/'+titleFont+'.ttf').fontSize(titleElement.getAttribute('font-size') || 14).text(titleElement.innerHTML || 'Demo text', titleElement.getAttribute('x'), titleElement.getAttribute('y'));
	doc.font('/home/richajoshi/backup/smart-agents/image_example/font/font/font/'+authorFont+'.ttf').fontSize(authorElement.getAttribute('font-size') || 14).text(authorElement.innerHTML || 'Demo text', authorElement.getAttribute('x'), authorElement.getAttribute('y'));

	var y = 150; // dynamic attribute not workin gyet...
	doc.image(image.getAttribute('href') || '/home/richajoshi/backup/smart-agents/image_example/icon.jpeg', image.getAttribute('x') || 50, y, {width: image.getAttribute('width') || 50});
	doc.end();
}

function getChildren (node) {
	if (node.childNodes && node.childNodes.constructor === Array && node.childNodes.length >= 1) {
		node.childNodes.map(function(childNode) {
			getChildren(childNode)
		})
	} else if (allowedNodes.indexOf(node.nodeName) !== -1) { // push only known elements.. 
		console.log("no children..");
		children.push(node);
	}
}

// ------------------------------------------------

pdfToSvg.getInstance = function(){
    if(this.instance === null){
        this.instance = new pdfToSvg();
    }
    return this.instance;
}

module.exports = pdfToSvg.getInstance();