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

pdfToSvg.prototype.createCover = function(svgElement, res) {
	var parser = new domParser();

	var doc = parser.parseFromString(svgElement, "application/xml");
	console.log(doc);

	var svgElem = doc.getElementsByTagName("svg");
	// traverse through svg element to get child elements:

	getChildren(svgElem[0]);
	console.log("children started:::---------------------------------- ");

	children.map(function(cNode) {
		try {
			console.log("node type: ", cNode.nodeType);
			console.log("node name: ", cNode.nodeName);
			console.log("attributes: ", cNode.attributes);
			console.log("outer html: ", cNode.outerHTML);
			console.log("text: ", cNode.textContent);
			console.log("text x: ", cNode.getAttribute('x'));
			console.log("text y: ", cNode.getAttribute('y'));
			console.log("text font size: ", cNode.getAttribute('font-size'));
			console.log("text font family: ", cNode.getAttribute('font-family'));
			console.log("text font weight: ", cNode.getAttribute('font-weight'));
		} catch(err) {
			console.log(err);
		}
	});
	/*svgElem[0].childNodes.map((childNode) => {
		console.log('-----------------------------------------');
		console.log(childNode.nodeType);
		console.log(childNode.nodeName);

		if (childNode.nodeName === "text") {
			console.log(childNode.childNodes[0].text);	
		}
		console.log("child nodes: --> ", childNode.childNodes);
		console.log(childNode.attributes);
		console.log(childNode.outerHTML);
		console.log(childNode.textContent);
		console.log(childNode);
		console.log('-----------------------------------------');
	});*/
	res.send('dom parser working...');

	/*doc = new PDFDocument;
	doc.pipe(fs.createWriteStream('output.pdf'));

	doc.fontSize(15).text('Wally Gator !', 50, 50);
	// Set the paragraph width and align direction
	doc.text('Wally Gator is a swinging alligator in the swamp. He\'s the greatest percolator when he really starts to romp. There has never been a greater operator in the swamp. See ya later, Wally Gator.', {
	    width: 410,
	    align: 'left'
	});

	doc.font('/home/richajoshi/backup/smart-agents/image_example/font/font/font/Spirax-Regular.ttf')
	   .fontSize(25)
	   .text('Some text with an embedded font!', 100, 100)

	doc.image('/home/richajoshi/backup/smart-agents/image_example/icon.jpeg', 50, 150, {width: 300});
	// PDF Creation logic goes here
	doc.end();*/
}

function getChildren (node) {
	if (node.childNodes && node.childNodes.constructor === Array && node.childNodes.length >= 1) {
		node.childNodes.map(function(childNode) {
			getChildren(childNode)
		})
	} else {
		// console.log(node.getAttribute('x'));
		// console.log(node.attributes);
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