// Create a theme object, that when installed, will change the look of
// Remark presentations.

// base_url = (Required) The base URL of the *theme*. You might wish
// to generate this dynamically with e.g.:
//   (str => str.substring(0, str.lastIndexOf("/")))(document.currentScript.src)
// This URL can be referenced in other parts of the theme with
// "$BASEURL"

// style_url = (Optional) The URL of the theme's .css file

// macros = (Optional) A mapping from keys to functions that define
// your theme's remark macros

// markdown_url = (Optional) The URL of the theme's Markdown preamble
// (to define slide templates etc)

function Theme(base_url, style_url, macros, markdown_url) {
    // Substitutions to be applied
    this.subs = [
	[/\$BASEURL/g, base_url]
    ];

    var subOrUndef = x => (x ? this.subst(x) : undefined);
    this.style = subOrUndef(style_url)
    this.macros = macros || {};
    this.markdown = subOrUndef(markdown_url);
};

Theme.prototype.subst = function(s) {
    this.subs.forEach(sub => {
	// regexp, replacement = sub
	s = s.replace(sub[0], sub[1]);
    });
    return s
};

Theme.prototype.loadUrl = function(url) {
    var xhr = new XMLHttpRequest();
    // TODO: make this asynchronous
    xhr.open('GET', url, false);
    xhr.send();
    return xhr.responseText;
};

// Install the theme into Remark (by intercepting the create function)
Theme.prototype.install = function (rmk, doc) {
    // So you can capture this in a closure
    var self = this;
    
    // in case you don't want to install on the global remark object
    rmk = rmk || remark;
    // ditto for current page
    doc = doc || document;
    
    if (this.style) {
	// Add style sheet to the document
	var fileref = doc.createElement("link");
	fileref.setAttribute("rel", "stylesheet");
	fileref.setAttribute("type", "text/css");
	fileref.setAttribute("href", this.style);
	doc.getElementsByTagName("head")[0].appendChild(fileref)
    }

    for (var key in this.macros) {
	// Install macros
	rmk.macros[key] = this.macros[key];
    }

    if (this.markdown) {
	// If there's a remark MD template, prepend to user's MD
	
	// Grab the original create method
	this.rmk_create = rmk.create;
	
	// Replace with our own
	rmk.create = function(options) {
	    // Note: 
	    // 'this' is the remark API object
	    // 'self' is the Theme object that was installed
	    options = options || {};
	    
	    var body;
	    var header = self.subst(self.loadUrl(self.markdown));
	    
	    if (options.sourceUrl) {
		body = self.loadUrl(options.sourceUrl);
		delete options.sourceUrl;
	    } else if (options.hasOwnProperty('source')){
		body = options.source;
	    } else {
		sourceElement = this.dom.getElementById('source');
		if (sourceElement) {
		    body = unescape(sourceElement.innerHTML);
		    sourceElement.style.display = 'none';
		}
	    }

	    options.source = header + body;

	    return self.rmk_create.apply(this, [options]);
	}
    }
};

function Footnoter() {
    var self = this;
    this.notes = [];
    this.add = function() {
	self.notes.push(this);
	return '<sup>' + self.notes.length + '</sup>';
    };
    this.clear = function() {
	self.notes = [];
    };

    this.end = function() {
	var ans = '.footnotes[\n';
	var len = self.notes.length;
	for (var i = 0; i < len; i++) {
	    ans += '1. ' + self.notes[i] + '\n';
	}
	ans += '\n]\n';
	self.notes = [];
	return ans;
    };
}

function Sectioner() {
    var self = this;
    this.items = [];
    this.add = function() {
	self.items.push(this);
	return "<ol class=\"toc\" id=\"" + self.items.length + "\"></ol>";
    };
    this.fixup = function() {
	var n = self.items.length;
	var maybe_toc = document.getElementsByClassName("toc");
	for (let item of maybe_toc) {
	    if (item.tagName == "OL") {
		var idx = item.id;
		for (var i = 0; i < n; i++) {
		    var text = document.createTextNode(self.items[i]);
		    var li = document.createElement("li");
		    item.appendChild(li);
		    if (i == (idx - 1)) {
			var strong = document.createElement("strong");
			li.appendChild(strong);
			strong.appendChild(text);
		    } else {
			li.appendChild(text);
		    }
		}
	    }
	}
    };
}

// Can override the header and footer macros to customise text
function VCTheme() {
    this.base = (str => str.substring(0, str.lastIndexOf("/")))(document.currentScript.src);
    this.fn = new Footnoter();
    this.sec = new Sectioner();
    // Capture this for use in closures
    var self = this;
    this.footer_text = "";
    this.footer = function() {
	return self.subst("<img src=\"$BASEURL/vestec-small.png\" height=\"40px\" /><img src=\"$BASEURL/CWL-Logo-Header.png\" height=\"60px\" /><p>"+ self.footer_text + "</p>");
    }
    macros = {
	scale_img: function (percentage) {
	    var url = this;
	    return '<img src="' + url + '" style="width: ' + percentage + '" />';
	},
	sec_slide: this.sec.add,
	fn_start: this.fn.clear,
	fn_clear: this.fn.clear,
	fn_show: this.fn.end,
	fn: this.fn.add,
	footer: this.footer
    }

    Theme.call(this, this.base, '$BASEURL/style.css', macros, '$BASEURL/templates.md');
}

VCTheme.prototype = Object.create(Theme.prototype);
VCTheme.prototype.constructor = VCTheme;

vestec_cwl = new VCTheme();
