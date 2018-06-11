var fs = require('fs'),
path = require('path'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit'),
config = require('./config/app.config.json');


var pdfToSvg = function() {
}

pdfToSvg.prototype.init = function() {
	// initialize file names
	this.svg = ['./images/BizCard_New/21.svg', './images/BizCard_New/22.svg', './images/BizCard_New/23.svg', './images/BizCard_New/24.svg', './images/BizCard_New/25.svg'];
	this.pdfFilePath = this.getPdfPath();

	this.startConversion();
}

pdfToSvg.instance = null;

pdfToSvg.prototype.startConversion = function() {
	// create pdf and set write stream
	this.generatePDF();

	// read svg files
	this.svg.map((svgImg, idx) => {
		this.convertToPdf(svgImg, (idx === (this.svg.length -1)) ? (false) : (true));
	});

	// close the document
	this.doc.end();
}

pdfToSvg.prototype.convertToPdf = function(svgFilename, addImgFlag = false) {
	// check if svg is array or single elemnt
	var svgData1 = this.readSVG(svgFilename);


	// write to document
	SVGtoPDF(this.doc, svgData1, 0, 0, {preserveAspectRatio: "true"});

	if (addImgFlag) {
		console.log("set to true;");
		this.doc.addPage();	
	} else {
		console.log("set to false");
	}
}


pdfToSvg.prototype.getPdfPath = function() {
	return path.join(__dirname, config.pdfOutDir, config.pdfFilePrefix + Date.now().toString()+".pdf");
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
		stream = fs.createWriteStream(this.pdfFilePath);	

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