var DOMParser, DocUtils, JSZip, XMLSerializer, fs, http, https, url,
  __slice = [].slice;

fs = require('fs');

DOMParser = require('xmldom').DOMParser;

XMLSerializer = require('xmldom').XMLSerializer;

JSZip = require('jszip');

url = require('url');

http = require('http');

https = require('https');

DocUtils = {};

DocUtils.env = fs.readFile != null ? 'node' : 'browser';

DocUtils.docX = [];

DocUtils.docXData = [];

DocUtils.getPathConfig = function() {
  if (DocUtils.pathConfig == null) {
    return "";
  }
  if (DocUtils.pathConfig.node != null) {
    return DocUtils.pathConfig.node;
  } else {
    return DocUtils.pathConfig.browser;
  }
};

DocUtils.escapeRegExp = function(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

DocUtils.charMap = {
  '&': "&amp;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;"
};

DocUtils.wordToUtf8 = function(string) {
  var endChar, startChar, _ref;
  _ref = DocUtils.charMap;
  for (endChar in _ref) {
    startChar = _ref[endChar];
    string = string.replace(new RegExp(DocUtils.escapeRegExp(startChar), "g"), endChar);
  }
  return string;
};

DocUtils.utf8ToWord = function(string) {
  var endChar, startChar, _ref;
  _ref = DocUtils.charMap;
  for (startChar in _ref) {
    endChar = _ref[startChar];
    string = string.replace(new RegExp(DocUtils.escapeRegExp(startChar), "g"), endChar);
  }
  return string;
};

DocUtils.defaultParser = function(tag) {
  return {
    'get': function(scope) {
      if (tag === '.') {
        return scope;
      } else {
        return scope[tag];
      }
    }
  };
};

DocUtils.nl2br = function(str, is_xhtml) {
  return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2');
};

DocUtils.loadDoc = function(path, options) {
  var a, async, basePath, callback, data, e, errorCallback, fileName, httpRegex, intelligentTagging, loadFile, noDocx, req, reqCallback, totalPath, urloptions;
  if (options == null) {
    options = {};
  }
  noDocx = options.docx != null ? !options.docx : false;
  async = options.async != null ? options.async : false;
  intelligentTagging = options.intelligentTagging != null ? options.intelligentTagging : false;
  callback = options.callback != null ? options.callback : null;
  basePath = "";
  if (path == null) {
    throw new Error('path not defined');
  }
  if (path.indexOf('/') !== -1) {
    totalPath = path;
    fileName = totalPath;
  } else {
    fileName = path;
    if (basePath === "" && (DocUtils.pathConfig != null)) {
      basePath = DocUtils.getPathConfig();
    }
    totalPath = basePath + path;
  }
  loadFile = function(data) {
    DocUtils.docXData[fileName] = data;
    if (noDocx === false) {
      DocUtils.docX[fileName] = new DocxGen(data, {}, {
        intelligentTagging: intelligentTagging
      });
      return DocUtils.docX[fileName];
    }
    if (callback != null) {
      return callback(DocUtils.docXData[fileName]);
    }
    if (async === false) {
      return DocUtils.docXData[fileName];
    }
  };
  if (DocUtils.env === 'browser') {
    return DocUtils.loadHttp(path, function(err, result) {
      if (err) {
        console.log('error');
        if (callback != null) {
          callback(true);
        }
        return;
      }
      return loadFile(result);
    }, async);
  } else {
    httpRegex = new RegExp("(https?)", "i");
    if (httpRegex.test(path)) {
      urloptions = url.parse(path);
      options = {
        hostname: urloptions.hostname,
        path: urloptions.path,
        method: 'GET',
        rejectUnauthorized: false
      };
      errorCallback = function(e) {
        throw new Error("Error on HTTPS Call");
      };
      reqCallback = function(res) {
        var data;
        res.setEncoding('binary');
        data = "";
        res.on('data', function(chunk) {
          return data += chunk;
        });
        return res.on('end', function() {
          return loadFile(data);
        });
      };
      switch (urloptions.protocol) {
        case "https:":
          req = https.request(options, reqCallback).on('error', errorCallback);
          break;
        case 'http:':
          req = http.request(options, reqCallback).on('error', errorCallback);
      }
      return req.end();
    } else {
      if (async === true) {
        return fs.readFile(totalPath, "binary", function(err, data) {
          if (err) {
            if (callback != null) {
              return callback(true);
            }
          } else {
            loadFile(data);
            if (callback != null) {
              return callback(data);
            }
          }
        });
      } else {
        try {
          data = fs.readFileSync(totalPath, "binary");
          a = loadFile(data);
          if (callback != null) {
            return callback(data);
          } else {
            return a;
          }
        } catch (_error) {
          e = _error;
          if (callback != null) {
            return callback();
          }
        }
      }
    }
  }
};

DocUtils.loadHttp = function(result, callback, async) {
  var errorCallback, options, req, reqCallback, urloptions, xhrDoc;
  if (async == null) {
    async = false;
  }
  if (DocUtils.env === 'node') {
    urloptions = url.parse(result);
    options = {
      hostname: urloptions.hostname,
      path: urloptions.path,
      method: 'GET',
      rejectUnauthorized: false
    };
    errorCallback = function(e) {
      return callback(e);
    };
    reqCallback = function(res) {
      var data;
      res.setEncoding('binary');
      data = "";
      res.on('data', function(chunk) {
        return data += chunk;
      });
      return res.on('end', function() {
        return callback(null, data);
      });
    };
    switch (urloptions.protocol) {
      case "https:":
        req = https.request(options, reqCallback).on('error', errorCallback);
        break;
      case 'http:':
        req = http.request(options, reqCallback).on('error', errorCallback);
    }
    return req.end();
  } else {
    xhrDoc = new XMLHttpRequest();
    xhrDoc.open('GET', result, async);
    if (xhrDoc.overrideMimeType) {
      xhrDoc.overrideMimeType('text/plain; charset=x-user-defined');
    }
    xhrDoc.onreadystatechange = function(e) {
      if (this.readyState === 4) {
        if (this.status === 200) {
          return callback(null, this.response);
        } else {
          return callback(true);
        }
      }
    };
    return xhrDoc.send();
  }
};

DocUtils.tags = {
  start: '{',
  end: '}'
};

DocUtils.clone = function(obj) {
  var flags, key, newInstance;
  if ((obj == null) || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (obj instanceof RegExp) {
    flags = '';
    if (obj.global != null) {
      flags += 'g';
    }
    if (obj.ignoreCase != null) {
      flags += 'i';
    }
    if (obj.multiline != null) {
      flags += 'm';
    }
    if (obj.sticky != null) {
      flags += 'y';
    }
    return new RegExp(obj.source, flags);
  }
  newInstance = new obj.constructor();
  for (key in obj) {
    newInstance[key] = DocUtils.clone(obj[key]);
  }
  return newInstance;
};

DocUtils.xml2Str = function(xmlNode) {
  var a, content, e;
  if (xmlNode === void 0) {
    throw new Error("xmlNode undefined!");
  }
  try {
    if (typeof global !== "undefined" && global !== null) {
      a = new XMLSerializer();
      content = a.serializeToString(xmlNode);
    } else {
      content = (new XMLSerializer()).serializeToString(xmlNode);
    }
  } catch (_error) {
    e = _error;
    content = xmlNode.xml;
  }
  return content = content.replace(/\x20xmlns=""/g, '');
};

DocUtils.Str2xml = function(str) {
  var parser, xmlDoc;
  if (DOMParser) {
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(str, "text/xml");
  } else {
    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
    xmlDoc.async = false;
    xmlDoc.loadXML(str);
  }
  return xmlDoc;
};

DocUtils.replaceFirstFrom = function(string, search, replace, from) {
  return string.substr(0, from) + string.substr(from).replace(search, replace);
};

DocUtils.encode_utf8 = function(s) {
  return unescape(encodeURIComponent(s));
};

DocUtils.convert_spaces = function(s) {
  return s.replace(new RegExp(String.fromCharCode(160), "g"), " ");
};

DocUtils.decode_utf8 = function(s) {
  var e;
  try {
    if (s === void 0) {
      return void 0;
    }
    return decodeURIComponent(escape(DocUtils.convert_spaces(s)));
  } catch (_error) {
    e = _error;
    console.log(s);
    console.log('could not decode');
    throw new Error('end');
  }
};

DocUtils.base64encode = function(b) {
  return btoa(unescape(encodeURIComponent(b)));
};

DocUtils.preg_match_all = function(regex, content) {

  /*regex is a string, content is the content. It returns an array of all matches with their offset, for example:
  	regex=la
  	content=lolalolilala
  	returns: [{0:'la',offset:2},{0:'la',offset:8},{0:'la',offset:10}]
   */
  var matchArray, replacer;
  if (!(typeof regex === 'object')) {
    regex = new RegExp(regex, 'g');
  }
  matchArray = [];
  replacer = function() {
    var match, offset, pn, string, _i;
    match = arguments[0], pn = 4 <= arguments.length ? __slice.call(arguments, 1, _i = arguments.length - 2) : (_i = 1, []), offset = arguments[_i++], string = arguments[_i++];
    pn.unshift(match);
    pn.offset = offset;
    return matchArray.push(pn);
  };
  content.replace(regex, replacer);
  return matchArray;
};

DocUtils.sizeOfObject = function(obj) {
  var key, log, size;
  size = 0;
  log = 0;
  for (key in obj) {
    size++;
  }
  return size;
};

DocUtils.maxArray = function(a) {
  return Math.max.apply(null, a);
};

DocUtils.getOuterXml = function(text, start, end, xmlTag) {
  var endTag, startTag;
  endTag = text.indexOf('</' + xmlTag + '>', end);
  if (endTag === -1) {
    throw new Error("can't find endTag " + endTag);
  }
  endTag += ('</' + xmlTag + '>').length;
  startTag = Math.max(text.lastIndexOf('<' + xmlTag + '>', start), text.lastIndexOf('<' + xmlTag + ' ', start));
  if (startTag === -1) {
    throw new Error("can't find startTag");
  }
  return {
    "text": text.substr(startTag, endTag - startTag),
    startTag: startTag,
    endTag: endTag
  };
};

module.exports = DocUtils;
