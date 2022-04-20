/*

Copyright 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

 * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
 * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 */

/* * * * * * * * * *       CORE       * * * * * * * * * */

var Core        = {};
Core.debugging  = true;
Core.Excessive  = true;
// delete Core.Excessive;

Core.debug      = function(debugMessage) { if(Core.debugging) if(debugMessage) { Core.log(debugMessage); debugger; } }

Core.log = function(logMessage) { if(Core.debugging) {
  if(arguments.length > 1) { arguments.map((currentValue) => { Core.log(currentValue); }); return; }
  console.log(logMessage);}
};

Core.i18n = function(key, defaultValue) {
  if(!key && Core.debugging) { Core.log("Error: Core.i18n() failed. No key."); }

  var translatedMessage = $.i18n(key);

  if(translatedMessage == "" || translatedMessage == key) {
    if(Core.debugging) { Core.log("Error: $.i18n() failed. No key: "+ key); }

    translatedMessage = defaultValue ? defaultValue : key;
  }

  return translatedMessage;
};

Core.alertDialog = function(alertText) {
  if(Core.Excessive) { Core.debug(alertText); }
  window.alert(alertText);
};

Core.promptDialog = function(promptText) {
  if(Core.Excessive) { Core.debug(promptText); }
  return window.prompt(promptText);
}

Core.confirmDialog = function(confirmText) {
  if(Core.Excessive) { Core.debug(confirmText); }
  return window.confirm(confirmText);
}

class jQueryError extends Error {
  constructor(jqXHR, textStatus, errorThrown) {
    Object.wtf=jqXHR;
    super(`jQueryError(url=${jqXHR.url},status=${jqXHR.status} ${jqXHR.statusText},errorThrown=${errorThrown}`);
    this.jqXHR = jqXHR;
    this.textStatus = textStatus;
    this.errorThrown = errorThrown;
    //this.responseHeaders = jqXHR.getAllResponseHeaders();
    // this.method = ??; this.url = ??;
    // jqXHR (and plain XHR) don't support accessing url and method, even though they must be somewhere inside.
    // therefore, if you want that, you need a rethrowing .catch (or a .finally) that adds fields from the request,
    // which could be done at the level of API.GET and API.POST so that nothing else needs to do the same.
    console.log(`this.message=${this.message}`)
  }
}

function errMessageWithReq(err) {
  let m = err.message
  if (err.reqInfo) m += ` (in ${err.reqInfo})`
  return m
}

/* NOTE: jsdoc below uses this typedef: interface jqDoneArgs {data: json; textStatus: string; jqXHR: jqXHR }
   where the name means that they are jqXHR's done callback's arguments. Note that they are an object (by opposition to
   having it as a 3-element array as in the `arguments` keyword).
   Also it is not possible to just do resolve(jqXHR) because it gets magically transformed into its responseJSON field. */

/* * * * * * * * * *       API       * * * * * * * * * */

var API = { f: "json", Core: {} };

API.newError = function(err) {
  if(Core.debugging) Core.log("An error has occurred.");
  return new Error(err);
};

API.raiseError = function(err) {
  if(Core.debugging) Core.log("An error has occurred.");
  throw API.NewError(err);
};

API.newPromise = function(apiCommand, promiseDef) {
  const apiPromise = new Promise(promiseDef);
  apiPromise.command = apiCommand;

  return apiPromise;
};

API.reject = function(reject, data) {
  if(Core.debugging) Core.log("An error has occurred.");
  reject(data);
};

API.setFailError = function(method, url, promise, reject) {
  promise.fail(( jqXHR, textStatus, errorThrown ) => {
    console.log({ jqXHR, textStatus, errorThrown });
    if(typeof errorThrown != "object") { errorThrown = API.newError(errorThrown); }
    errorThrown.reqInfo = `${method} ${url}`
    errorThrown.jqXHR = jqXHR;
    errorThrown.textStatus = textStatus;
    API.reject(reject, errorThrown);
  })
  promise.error(( jqXHR, textStatus, errorThrown ) => {
    console.log({ jqXHR, textStatus, errorThrown });
    const err = new jQueryError(jqXHR,textStatus,errorThrown);
    err.reqInfo = `${method} ${url}`
    API.reject(reject, err);
  })
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
/** @return {syncMode===true      ? String : void} */
API.GET = function(url, queryData, syncMode) {
  if(syncMode === undefined) return API.newPromise("GET, url: "+ url, (resolve, reject) => {
    API.setFailError("GET",url, $.get(url, queryData, ( response, textStatus, jqXHR ) => { resolve({response, textStatus, jqXHR}) }, API.f ), reject)
  });

  if(syncMode !== true) { Core.debug(); }

  var ajaxResult = $.ajax({
       async: false,
         url: url,
      method: "get",
        data: queryData,
    dataType: API.f
  });

  // Core.log(ajaxResult.responseJSON);

  return ajaxResult.responseJSON;
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
/** @return {syncMode===true      ? String : void} */
API.POST = function(url, queryData, postData, syncMode) {
  var fullUrl = queryData ? url +"?"+ $.param(queryData) : url;

  if(syncMode === undefined) return API.newPromise("POST, url: "+ url, (resolve, reject) => {
    API.setFailError("POST", url, $.post(fullUrl, postData, function( data, textStatus, jqXHR ) { 
      resolve({ data, textStatus, jqXHR }) 
    }, API.f ), reject);
  });

  if(syncMode !== true) { Core.debug(); }

  var ajaxResult = $.ajax({
       async: false,
         url: fullUrl,
      method: "post",
        data: postData,
    dataType: API.f
  });

  // Core.log(ajaxResult.responseJSON);

  return ajaxResult.responseJSON;
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
/** @return {syncMode===true      ? String : void} */
API.Core.getCommand = function(command, queryData, syncMode) {
  return API.GET("command/core/"+ command, queryData, syncMode);
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
/** @return {syncMode===true      ? String : void} */
API.Core.postCommand = function(command, queryData, postData, syncMode) {
  return API.POST("command/core/"+ command, queryData, postData, syncMode);
};

/** @return {syncMode===undefined ? Promise<string> : void} */
/** @return {syncMode===true      ? String : void} */
API.Core.getCsrfToken = function(syncMode) {
  const apiCommand    = "get-csrf-token";
  
  if(syncMode === undefined) return API.newPromise(apiCommand, (resolve, reject) => {
    API.Core.getCommand(apiCommand)
      .then( ({data}) => { resolve( data['token'] ); } )
      .catch( (err)   => { reject(err); } );
  });
  
  if(syncMode !== true) { Core.debug(); }

  return API.Core.getCommand(apiCommand, {}, true);
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
/** @return {syncMode===true      ? String : void} */
API.Core.postCommandCsrf = function(command, queryData, postData, syncMode) {
  if(syncMode === undefined) return API.newPromise(command, (resolve, reject) => {
    API.Core.getCsrfToken()
      .then( (token) => {
        if (typeof postData == 'string') {
          postData += "&"+ $.param({csrf_token: token});
        } else {
          postData['csrf_token'] = token;
        }

        API.postCommand(command, queryData, postData)
          .then(({data, textStatus, jqXHR}) => { resolve({data, textStatus, jqXHR}); } )
          .catch( (err) => { reject(err); } );
      }).catch( (err) => { reject(err); } );
  });

  if(syncMode !== true) { Core.debug(); }
  
  var token = API.Core.getCsrfToken(true);  
  if(typeof postData == 'string') 
    { postData += "&"+ token } else { postData['csrf_token'] = token; }
  
  API.postCommand(command, queryData, postData, true);
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
API.Core.getAllPreferences = function(syncMode) {
  const apiCommand    = "get-all-preferences";
  
  if(syncMode === undefined) return API.newPromise(apiCommand, (resolve, reject) => {
    API.Core.postCommand( apiCommand )
      .then( ({data}) => { resolve(data); } )
      .catch( (err) => { reject(err); } );
  });

  if(syncMode !== true) { Core.debug(); }
  return API.Core.postCommand( apiCommand, true )
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
API.Core.setPreferences = function(key, newValue, syncMode) {
  const apiCommand = "set-preference";
  
  if(syncMode === undefined) 
    return API.Core.postCommandCsrf( apiCommand, $.param({ name: key }), { value: JSON.stringify(newValue) } );

  if(syncMode !== true) { Core.debug(); }
  
  return API.Core.postCommandCsrf( apiCommand, $.param({ name: key }), { value: JSON.stringify(newValue) }, true );
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
API.Core.loadLanguage = function(lang, syncMode) {
  const apiCommand    = "load-language";
  
  if(syncMode === undefined) return API.newPromise(apiCommand, (resolve, reject) => {
    API.Core.postCommand( apiCommand, {}, { module : "core", lang } )
      .then( ({data}) => { resolve(data); } )
      .catch( (err) => { reject(err); } );
  });

  if(syncMode !== true) { Core.debug(); }
  
  return API.Core.postCommand( apiCommand, {}, { module : "core", lang }, true );
};


/* * * * * * * * * *   PREFERENCES   * * * * * * * * * */

var Preferences = {};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
Preferences.load = function(syncMode) {
  if(syncMode === undefined) { return API.Core.getAllPreferences()
      .then( (data) => { Preferences.values = data; })
      .catch( (err) => {
        Core.debug(err);
        var errorMessage = Core.i18n('core-index/prefs-loading-failed', errMessageWithReq(err));
        Core.alertDialog(errorMessage);
      });
  }
  
  if(syncMode !== true) { Core.debug(); }
  
  return API.Core.getAllPreferences(true);
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
Preferences.getValue = function(key, defaultValue, freshRead, syncMode) {
  if(freshRead === undefined) {
    if(!Object.hasOwnProperty.call(Preferences.values,key)) 
      { return defaultValue; } else { return Preferences.values[key]; }
  }
  
  // @todo handle syncMode & freshRead
  if(!Object.hasOwnProperty.call(Preferences.values,key)) 
    { return defaultValue; } else { return Preferences.values[key]; }
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
Preferences.setValue = function(key, newValue, syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    API.Core.setPreferences(key, newValue)
      .then( () => { Preferences.values[key] = newValue; resolve(); } )
      .catch( (err) => { Core.alertDialog("Can save value."); reject(err); } );
  });
  
  if(syncMode !== true) { Core.debug(); }
  
  return API.Core.setPreferences(key, newValue, true);
};


/* * * * * * * * * *   LANGUAGES   * * * * * * * * * */

var Languages = {};
Languages.userNavigatorPref = function() { return (navigator.language || navigator.userLanguage).split("-")[0] }

Languages.i18n = function(key, defaultValue) {
  if(!key && Core.debugging) { Core.log("Error: Languages.i18n() failed. No key."); }

  var translatedMessage = $.i18n(key);

  if(translatedMessage == "" || translatedMessage == key) {
    if(Core.debugging) { Core.log("Error: Languages.i18n() failed. No translation for key: "+ key); }

    translatedMessage = defaultValue ? defaultValue : key;
  }

  return translatedMessage;
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
Languages.load = function(lang, syncMode) {
  if(syncMode === undefined) { return API.Core.loadLanguage(lang)
    .then( (langData) => {
      Languages.dictionary = langData['dictionary'];
      Languages.lang       = langData['lang'];
    })
    .catch( (err) => {
      var errorMessage = Core.i18n('core-index/langs-loading-failed', errMessageWithReq(err));
      Core.alertDialog(errorMessage);
    });
  }
  
  if(syncMode !== true) { Core.debug(); }
  
  const langData = API.Core.loadLanguage(lang, true);
  
  Languages.dictionary = langData['dictionary'];
  Languages.lang       = langData['lang'];
  
  return langData;
};

/** @return {syncMode===undefined ? Promise<void> : void} */
/** @return {syncMode===true      ? String        : void} */
Languages.setDefaultLanguage = function(syncMode) {
  Languages.lang = Languages.userNavigatorPref();
  
  if(syncMode === undefined) { return Languages.load().then( () => {
    $.i18n().load(Languages.dictionary, Languages.lang);
    $.i18n().locale = Languages.lang;
  })}
  
  if(syncMode !== true) { Core.debug(); }
  
  Languages.load(Languages.lang, true);
  $.i18n().load(Languages.dictionary, Languages.lang);
  $.i18n().locale = Languages.lang;
  
  return;
};

Languages.deDupUserMetaData = function(arrObj)  {
    var result = _.uniq(JSON.parse(arrObj), function(x){
        return x.name;
    });

    return JSON.stringify(result).replace(/"/g, '"');
};


/* * * * * * * * * *       TAG       * * * * * * * * * */
var Tag = {};

/*
Tag.protoConstructor = function(tagName, attributes, parent) { 
  Tag[tagName] = function(attributes, parent) { 
    return Tag.new(Tag.attr(attributes, tagName, parent)); 
  }
};

Tag.protoAttributes = function(tag, attributes, parent) { 
  Tag[tag] = function(attributes, parent) { 
    return Tag.newAttr(Tag.Attr(attributes, tag, parent)); 
  }
};

Tag.exposedAttributes = ["id", "name", "class", "style", "href", "type", "size", "height", "width", "button"];
Tag.tags     = Tag.exposedAttributes.map((attrsName) => { Tag.protoAttributes( {}, attrsName, {} ); });

Tag.tagsName = ["body", "div", "h1", "h2", "h3", "table", "tbody", "th", "tr", "td", "form", "input", "textarea", "button"];
Tag.tags     = Tag.tagsName.map((tagName) => { Tag.protoConstructor( {}, tagName, {} ); }); // { Tag.Create(arguments[0], tagName, arguments[2]); });
// DEBUG arguments[0] : do kossé ?!
// Tag.body    = function(attributes, parent) { return Tag.new(Tag.attr(attributes, "body", parent)) };

if(Core.isDebugging) Core.debug("Error");

/*
Tag.tags.map((object, index) => { Object.defineProperty(object, Tag.tagsName[index], { 
  get : function (value) { return Tag[object.name]; } 
//  set : Tag[object.name]  // function (value) { Tag(value) } 
}); });
*/

Tag.new = function(attributes) {
  if(attributes == undefined) Core.raiseError();
  if(this != undefined) Core.log(this);
  
  if(arguments.length > 1) { attributes.map((newTag) => { Tag.new(newTag); }); return; }
  
  var tagParent   = parent | attributes.parent || null;
  
  if(tagParent) { parent.children.push(newTag); }
     const newTag = new Tag;

     newTag.isNew = true;
      newTag.name = attributes.name;
    newTag.parent = tagParent;
  newTag.children = [];
     newTag.class = attributes.class  || null;
        newTag.id = attributes.id     || null;

  return newTag;
};

Tag.attrMergeValidate = function(attributes, name, parent) {
  if(attributes.name === undefined) {
    if(name === undefined) { Core.debug(); }
    attributes.name = name;
  }
  if(attributes.parent === undefined) { attributes.parent = parent || null }

  return attributes;
};

Tag.id = function(idData) {
  const newTagJq  = $("#"+ idData);
  const tagId     = newTag.attr("id");
  const newTag    = Tag.new( Tag.attr({ id:tagId }) );
        newTag.jq = newTagJq;
  
  return newTag;
};

/* * * * * * * * * *       PAGE       * * * * * * * * * */

var Page   = { name: "preferences" }

//DOM.body   = Tag.body;
//DOM.body   = Tag.id("body-info");


/* * * * * * * * * *       UI       * * * * * * * * * */

var preferenceUIs = [];

var Refine = {
};

Refine.wrapCSRF = function(onCSRF) { Core.API.GetCsrfToken().then( onCSRF ); };
Refine.postCSRF = function(url, data, success, dataType, failCallback) {
  Core.POST( url, data).then(success).fail(failCallback);
};


function PreferenceUI(tr, key, initialValue) {
  var self = this;

  var td0 = tr.insertCell(0);
  $(td0).text(key);

  var td1 = tr.insertCell(1);
  $(td1).text((initialValue !== null) ? initialValue : "");

  var td2 = tr.insertCell(2);

  $('<button class="button">').text(Core.i18n('core-index/edit')).appendTo(td2).click(function() {
    var newValue = window.prompt(Core.i18n('core-index/change-value')+" " + key, $(td1).text());
    if (newValue == null) { return; } 

    newValue = (key === "userMetadata") ? Languages.deDupUserMetaData(newValue) : newValue;        

    Preferences.setValue(key, newValue);

    $(td1).text(newValue);
  });

  $('<button class="button">').text(Core.i18n('core-index/delete')).appendTo(td2).click(function() {
    if (!window.confirm(Core.i18n('core-index/delete-key')+" " + key + "?")) { return }
    Preferences.setValue(key);

    $(tr).remove();
    for (var i = 0; i < preferenceUIs.length; i++) {
      if (preferenceUIs[i] !== self) { continue; }

      preferenceUIs.splice(i, 1);
      break;
    }
  });
}

function populatePreferences() {
  var body = $("#body-info").empty();

  $("#or-proj-starting").text(Core.i18n('core-project/starting')+"...");
  $('<h1>').text(Core.i18n('core-index/preferences')).appendTo(body);

  var table = $('<table>')
  .addClass("list-table")
  .addClass("preferences")
  .html('<tr><th>'+Core.i18n('core-index/key')+'</th><th>'+Core.i18n('core-index/value')+'</th><th></th></tr>')
  .appendTo(body)[0];

  for (var k in Preferences.values) {
    var tr = table.insertRow(table.rows.length);
    preferenceUIs.push(new PreferenceUI(tr, k, Preferences.values[k]));
  }

  var trLast = table.insertRow(table.rows.length);
  var tdLast0 = trLast.insertCell(0);
  trLast.insertCell(1);
  trLast.insertCell(2);
    
  $('<button class="button">').text(Core.i18n('core-index/add-pref')).appendTo(tdLast0).click(function() {
    var key = window.prompt(Core.i18n('core-index/add-pref'));
    if (!key) { return; }  // @todo old behavior kept, but should be handled.
    
  var value = window.prompt(Core.i18n('core-index/pref-key'));
  if (!value === null) { return; }  // @todo old behavior kept, but should be handled.
    
  var tr = table.insertRow(table.rows.length - 1);
  preferenceUIs.push(new PreferenceUI(tr, key, value));

  value = (key === "userMetadata") ? Languages.deDupUserMetaData(value) : value;        
    
  Preferences.setValue(key, value);
  });
}

function onLoad() { Languages.setDefaultLanguage(true); Preferences.load().then( populatePreferences ) }

$(onLoad);