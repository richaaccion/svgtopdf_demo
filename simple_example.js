var fs = require('fs'),
PDFDocument = require('pdfkit'),
SVGtoPDF = require('svg-to-pdfkit');

var svg = `<svg height="150" width="400">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  <ellipse cx="200" cy="70" rx="85" ry="55" fill="url(#grad1)" />
  Sorry, your browser does not support inline SVG.
</svg>`;

// create document
var doc = new PDFDocument({
	size: [816, 528],
	layout: 'portrait'
});

// create stream
var stream = fs.createWriteStream('./assets/output/file.pdf');
stream.on('finish', function() {
	console.log(fs.readFileSync('./assets/output/file.pdf'));
})
doc.pipe(stream);


doc.rect(0, 0, 396, 612).lineWidth(0).fillAndStroke("yellow", 'black');

// // write to document
// SVGtoPDF(doc, svg, 0, 0);

// close document
doc.end();
