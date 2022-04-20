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
Core.Debugging  = true;
delete Core.Excessive;

Core.Debug      = function(debugMessage) { if(Core.Debugging) debugger; if(debugMessage) Core.Log(debugMessage); }

Core.Log = function(logMessage) { if(Core.Debugging) {
  if(arguments.length > 1) { arguments.map((currentValue) => { Core.Log(currentValue); }); return; }
  console.log(logMessage);}
};

Core.i18n = function(key, defaultValue) {
  if(!key && Core.Debugging) { Core.Log("Error: Core.i18n() failed. No key."); }

  var translatedMessage = $.i18n(key);

  if(translatedMessage == "" || translatedMessage == key) {
    if(Core.Debugging) { Core.Log("Error: $.i18n() failed. No key: "+ key); }

    translatedMessage = defaultValue ? defaultValue : key;
  }

  return translatedMessage;
};

Core.alertDialog = function(alertText) {
  if(Core.Excessive) { Core.Debug(alertText); }
  window.alert(alertText);
};

Core.promptDialog = function(promptText) {
  if(Core.Excessive) { Core.Debug(promptText); }
  return window.prompt(promptText);
}

Core.confirmDialog = function(confirmText) {
  if(Core.Excessive) { Core.Debug(confirmText); }
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

API.NewError = function(err) {
  if(Core.Debugging) Core.Log("An error has occurred.");
  return new Error(err);
};

API.NewPromise = function(apiCommand, promiseDef) {
  const apiPromise = new Promise(promiseDef);
  apiPromise.command = apiCommand;

  return apiPromise;
};

API.Reject = function(reject, data) {
  if(Core.Debugging) Core.Log("An error has occurred.");
  reject(data);
};

API.SetFailError = function(method, url, promise, reject) {
  promise.fail(( jqXHR, textStatus, errorThrown ) => {
    console.log({ jqXHR, textStatus, errorThrown });
    if(typeof errorThrown != "object") { errorThrown = API.NewError(errorThrown); }
    errorThrown.reqInfo = `${method} ${url}`
    errorThrown.jqXHR = jqXHR;
    errorThrown.textStatus = textStatus;
    API.Reject(reject, errorThrown);
  })
  promise.error(( jqXHR, textStatus, errorThrown ) => {
    console.log({ jqXHR, textStatus, errorThrown });
    const err = new jQueryError(jqXHR,textStatus,errorThrown);
    err.reqInfo = `${method} ${url}`
    API.Reject(reject, err);
  })
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
API.GET = function(url, queryData, syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    API.SetFailError("GET",url, $.get(url, queryData, ( response, textStatus, jqXHR ) => { resolve({response, textStatus, jqXHR}) }, API.f ), reject)
  });

  if(syncMode !== true) { Core.Debug(); }

  var ajaxResult = $.ajax({
       async: true,
         url: url,
      method: "get",
        data: queryData,
    dataType: API.f
  });

  Core.Log(ajaxResult);

  return;
};


API.POST = function(url, queryData, postData, syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    var fullUrl = queryData ? url +"?"+ $.param(queryData) : url;
    API.SetFailError("POST",url,$.post(fullUrl, postData, function( data, textStatus, jqXHR ) { resolve({ data, textStatus, jqXHR }) }, API.f ), reject)
  });

  if(syncMode !== true) { Core.Debug(); }

  var ajaxResult = $.ajax({
       async: true,
         url: url,
      method: "post",
        data: postData,
    dataType: API.f
  });

  Core.Log(ajaxResult.responseJSON);

  return ajaxResult.responseJSON;
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
API.Core.GetCommand = function(command, queryData, syncMode) {
  if(syncMode === undefined) return API.GET("command/core/"+ command, queryData);
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
API.Core.PostCommand = function(command, queryData, postData, syncMode) {
  if(syncMode === undefined) return API.POST("command/core/"+ command, queryData, postData);
  API.SyncPOST("command/core/"+ command, queryData, postData);
};

/** @return {syncMode===undefined ? Promise<string> : void} */
API.Core.GetCsrfToken = function(syncMode) {
  const apiCommand = "get-csrf-token";

  if(syncMode === undefined) return API.NewPromise(apiCommand, (resolve, reject) => {
    API.Core.GetCommand(apiCommand, {} )
      .then( ({data}) => { resolve( data['token'] ); } )
      .catch( (err) => { reject(err); } );
  });
};

/** @return {syncMode===undefined ? Promise<jqDoneArgs> : void} */
API.Core.PostCommandCsrf = function(command, queryData, postData, syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    API.Core.GetCsrfToken()
      .then( (token) => {
        if (typeof postData == 'string') {
          postData += "&" + $.param({csrf_token: token});
        } else {
          postData['csrf_token'] = token;
        }

        API.PostCommand(command, queryData, postData)
          .then(({data, textStatus, jqXHR}) => { resolve({data, textStatus, jqXHR}); } )
          .catch( (err) => { reject(err); } );
      })
      .catch(  (err) => { reject(err); } );
  });
};

/** @return {syncMode===undefined ? Promise<PlainObject> : void} */
API.Core.GetAllPreferences = function(syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    API.Core.PostCommand( "get-all-preferences", {} )
      .then( ({data}) => { resolve(data); } )
      .catch( (err) => { reject(err); } );
  });
};

/** @return {syncMode===undefined ? Promise<void> : void} */
API.Core.SetPreferences = function(key, newValue, syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    API.Core.PostCommandCsrf( "set-preference", $.param({ name: key }), { value: JSON.stringify(newValue) } )
      .then( ({data}) => { resolve(); } )
      .catch( (err) => { reject(err); } );
  });
};

/** @return {syncMode===undefined ? Promise<void> : void} */
API.Core.LoadLanguage = function(lang, syncMode) {
  if(syncMode === undefined) return new Promise((resolve, reject) => {
    API.Core.PostCommand( "load-language", {}, { module : "core", lang } )
      .then( ({data}) => { resolve(data); } )
      .catch( (err) => { reject(err); } );
  });
};


/* * * * * * * * * *   PREFERENCES   * * * * * * * * * */

var Preferences = {};

/** @return {syncMode===undefined ? Promise<void> : void} */
Preferences.Load = function(syncMode) {
  return new Promise((resolve, reject) => {
    API.Core.GetAllPreferences()
      .then( (data) => {
        Preferences.values = data;
        resolve(data);
      })
      .catch( (err) => {
        Core.Log(err);
        var errorMessage = Core.i18n('core-index/prefs-loading-failed', errMessageWithReq(err));
        Core.alertDialog(errorMessage);
        reject(err);
      });
  });
};

Preferences.getValue = function(key, defaultValue, syncMode) {
  if(!Object.prototype.hasOwnProperty.call(Preferences.values,key)) { return defaultValue; }

  return Preferences.values[key];
};

Preferences.setValue = function(key, newValue, syncMode) {
  return new Promise((resolve, reject) => {
    API.Core.SetPreferences(key, newValue, syncMode)
      .then( () => { Preferences.values[key] = newValue; resolve(); } )
      .catch( (err) => { Core.alertDialog("Can save value."); reject(err); } );
  });
};


/* * * * * * * * * *   LANGUAGES   * * * * * * * * * */

var Languages = {};
Languages.UserNavigatorPref = function() { return (navigator.language || navigator.userLanguage).split("-")[0] }

Languages.i18n = function(key, defaultValue, syncMode) {
  if(!key && Core.Debugging) { Core.Log("Error: Languages.i18n() failed. No key."); }

  var translatedMessage = $.i18n(key);

  if(translatedMessage == "" || translatedMessage == key) {
    if(Core.Debugging) { Core.Log("Error: Languages.i18n() failed. No translation for key: "+ key); }

    translatedMessage = defaultValue ? defaultValue : key;
  }

  return translatedMessage;
};

Languages.Load = function(syncMode) {
  return new Promise((resolve, reject) => {
    API.Core.LoadLanguage(syncMode)
    .then( (data) => {
      Languages.dictionary = data['dictionary'];
      Languages.lang = data['lang'];
      resolve();
    })
    .catch( (err) => {
      var errorMessage = Core.i18n('core-index/langs-loading-failed', errMessageWithReq(err));
      Core.alertDialog(errorMessage);
      reject(err);
    });
  });
};

Languages.setDefaultLanguage = function() {
  return new Promise((resolve, reject) => {
    Languages.lang = Languages.UserNavigatorPref();
    Languages.Load().then(() => {
      $.i18n().load(Languages.dictionary, Languages.lang);
      $.i18n().locale = Languages.lang;
      resolve()
    }).catch(reject)
  })
};

Languages.deDupUserMetaData = function(arrObj)  {
    var result = _.uniq(JSON.parse(arrObj), function(x){
        return x.name;
    });

    return JSON.stringify(result).replace(/"/g, '"');
};


/* * * * * * * * * *       PAGE       * * * * * * * * * */

var Page   = { name: "preferences" };

DOM.body   = Tag.body;
DOM.body   = Tag.id("body-info");


/* * * * * * * * * *       UI       * * * * * * * * * */

var preferenceUIs = [];

var Refine = {
};

Refine.wrapCSRF = function(onCSRF) {
   Core.API.GetCsrfToken().then( () => onCSRF );
};

Refine.postCSRF = function(url, data, success, dataType, failCallback) {
  Core.PostCommandCsrf( url.substr(13), {}, data).then(success).fail(failCallback);
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
    if (newValue == null) { return; } // @todo old behavior kept, but should be handled.
    
	newValue = (key === "userMetadata") ? deDupUserMetaData(newValue) : newValue;        

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
		
	value = (key === "userMetadata") ? deDupUserMetaData(value) : value;        
		
	Preferences.setValue(key, value);
  });
}

function onLoad() { Languages.setDefaultLanguage(true); Preferences.Load().then( (data) => { populatePreferences(); }); }

$(onLoad);