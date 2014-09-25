var DocUtils, ImgReplacer, JSZip, PNG;

DocUtils = require('./docUtils');

PNG = require('png-js');

JSZip = require('jszip');

module.exports = ImgReplacer = (function() {
  function ImgReplacer(xmlTemplater) {
    this.xmlTemplater = xmlTemplater;
    this.imgMatches = [];
    this;
  }
)();
