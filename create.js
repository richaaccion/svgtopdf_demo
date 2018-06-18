var PDFDocument = require('pdfkit'), doc;

var fs = require('fs');	

doc = new PDFDocument;
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
doc.end();