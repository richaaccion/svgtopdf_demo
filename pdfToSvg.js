var fs = require('fs'),
path = require('path'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit'),
execCommand = require('./execCommand'),
config = require('./config/app.config.json');


var pdfToSvg = function() {
}

pdfToSvg.prototype.init = function(bookName) {
	this.coverPageFilePath = this.getCoverPageFile(); // path where cover page will be saved.
	this.bookName = bookName; // predefined ebook to which cover page needs to be appended.
	this.eBookDir = config.eBookDir; // existing ebook directory where predefined books are saved
	this.ebookName = this.getEbookName(); // full file path of final ebook
}

pdfToSvg.instance = null;

pdfToSvg.prototype.startConversion = function(svgTag) {
	// create pdf and set write stream
	this.generatePDF();

	this.convertToPdf(svgTag, false);

	// close the document
	this.doc.end();

	// once cover page is created, append it to existing prebook
	this.appendCoverToBook();
}

pdfToSvg.prototype.appendCoverToBook = function() {
	var command = this.getConversionCommand();
	execCommand.execute(this.getConversionCommand(), (res) => {
		console.log(res);
	});
}

pdfToSvg.prototype.convertToPdf = function(svgTag, addImgFlag = false) {
	SVGtoPDF(this.doc, svgTag, 0, 0, {preserveAspectRatio: "true"});

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

// ------------------------------------------------

pdfToSvg.getInstance = function(){
    if(this.instance === null){
        this.instance = new pdfToSvg();
    }
    return this.instance;
}

module.exports = pdfToSvg.getInstance();