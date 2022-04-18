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


/* * * * * * * * * *       Core       * * * * * * * * * */

var Core = {};
Core.Debugging = true;

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
    // which could be done at the level of API.GET and API.POST so that nothing else needs to do the same. (actually added this as .reqInfo)
    console.log(`this.message=${this.message}`)
  }
}

/* NOTE: jsdoc below uses this typedef: interface jqDoneArgs {data: json; textStatus: string; jqXHR: jqXHR }
   where the name means that they are jqXHR's done callback's arguments. Note that they are an object (by opposition to
   having it as a 3-element array as in the `arguments` keyword).
   Also it is not possible to just do resolve(jqXHR) because it gets magically transformed into its responseJSON field. */

Core.i18n = function(key, defaultValue) {
  if(!key && Core.Debugging) { console.log("Error: Core.i18n() failed. No key."); }

  var translatedMessage = $.i18n(key);

  //TODO but what if the translation file says e.g. key "button" translates to "button" in English ? It would count as untranslated below.
  if(translatedMessage == "" || translatedMessage == key) {
    if(Core.Debugging) { console.log("Error: $.i18n() failed. No key: "+ key); }

    translatedMessage = defaultValue || key;
  }

  return translatedMessage;
}

Core.alertDialog = function(alertText) {
  window.alert(alertText);
  if(Core.Debugging) { debugger; }
}


/* * * * * * * * * *      TESTS       * * * * * * * * * *

//* * *   CORE   * * *
// Core.alertDialog("Test of a dialog.");

keyTest = "core-index/prefs-loading-failed"; resultTest = Core.i18n(keyTest, "UnhandledValue");
if(resultTest != "" && resultTest )
   console.log("Core.i18n translated "+ keyTest +".");
else
  console.log("Error when assigning ValAB to variable test-preference");


//* * *   API   * * *
API.GET(true, "command/core/load-language")
  .then((language) => { console.log("Language: "+ language); } )
  .catch((err)     => { console.log("Error API.GET() can't read load-language"); });

// API.GET(false, "command/core/load-language")

// API.POST(true, "command/core/load-language").then((data) => { console.log(data); } );

API.Core.GetCsrfToken(true)
  .then((token) => { console.log("Token: "+ token); })
  .catch((err)  => { console.log("Error API.CORE.GetCsrfToken() can't get token"); });

API.Core.GetCommand(true, "load-language")
  .then((data) => { console.log("Data: "+ data); } )
  .catch((err) => { console.log("Error API.CORE.GetCommand() can't read load-language"); });

//API.Core.PostCommand(true, "load-language").then((data) => { console.log(data); } );

//API.Core.PostCommandCsrf("load-language").then((data) => { console.log(data); } );

API.Core.GetAllPreferences()
  .then((prefs) => { console.log("Preferences: "+ prefs); })
  .catch((err)  => { console.log("Error API.CORE.GetAllPreferences() can't get preferences"); });

API.Core.SetPreferences("test-preference", "ValAB")
  .then(() => { console.log("test-preference a maintenant la valeur ValAB"); } )
  .catch(() => { console.log("Error when assigning ValAB to variable test-preference"); });

//* * *   PREFS   * * *
Preferences.Load()
  .then(() => { console.log("The preferences were loaded."); } )
  .catch(() => { console.log("Error while loading the preferences."); });

//* * *   LANGS   * * *
Languages.Load()
  .then(() => { console.log("The language were loaded."); } )
  .catch(() => { console.log("Error while loading the language."); });

keyTest = "core-index/prefs-loading-failed"; resultTest = Core.i18n(keyTest, "UnhandledValue");
if(resultTest != "" && resultTest )
   console.log("Languages.i18n translated "+ keyTest +".");
else
  console.log("Error of Languages.i18n: when assigning ValAB to variable test-preference");


/* * * * * * * * * *       API       * * * * * * * * * */

var API = { Core: {} };

API.NewError = function(err) {
  if(Core.Debugging) console.log("An error has occurred.");
  return new Error(err);
}

API.NewPromise = function(apiCommand, promiseDef) {
  const apiPromise = new Promise(promiseDef);
  apiPromise.command = apiCommand;

  return apiPromise;
}

API.Reject = function(reject, data) {
  if(Core.Debugging) console.log("An error has occurred.");
  reject(data);
}

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
}

/** @return {Promise<jqDoneArgs>} */
API.GET = function(url, queryData) {
  return new Promise((resolve, reject) => {
    API.SetFailError("GET", url, $.get(url, queryData, ( data, textStatus, jqXHR ) => {
      if (Core.Debugging) console.log("API.GET $.get",{data, textStatus, jqXHR })
      resolve({data,textStatus,jqXHR}) }, "json" ), reject)
  });
  /*const ajaxResult = $.ajax({
    async: true,
    url: url,
    method: "get",
    data: queryData,
    dataType: "json"
  });*/
}

/** @return {Promise<jqDoneArgs>} */
API.POST = function(url, queryData, postData) {
  return new Promise((resolve, reject) => {
    var fullUrl = queryData ? url +"?"+ $.param(queryData) : url;
    API.SetFailError("POST", url, $.post(fullUrl, postData, function( data, textStatus, jqXHR ) {
      if (Core.Debugging) console.log("API.POST $.post",{data, textStatus, jqXHR })
      resolve({data,textStatus,jqXHR}) }, "json" ), reject)
  });
}

/** @return {Promise<jqDoneArgs>} */
API.Core.GetCommand = function(command, queryData) {
  return API.GET("command/core/"+ command, queryData);
}

/** @return {Promise<jqDoneArgs>} */
API.Core.PostCommand = function(command, queryData, postData) {
  return API.POST("command/core/"+ command, queryData, postData);
}

/** @return {Promise<string>} */
API.Core.GetCsrfToken = function() {
  return API.NewPromise("get-csrf-token", (resolve, reject) => {
    API.Core.GetCommand("get-csrf-token", {} )
      .then( ({data}) => { resolve( data['token'] ); } )
      .catch( (err) => { reject(err); } );
  });
}

/** @return {Promise<jqDoneArgs>} */
API.Core.PostCommandCsrf = function(command, queryData, postData) {
  return new Promise((resolve, reject) => {
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
}

/** @return {Promise<PlainObject>} */
API.Core.GetAllPreferences = function() {
  return new Promise((resolve, reject) => {
    API.Core.PostCommand( "get-all-preferences", {} )
      .then( ({data}) => { resolve(data); } )
      .catch( (err) => { reject(err); } );
  })
}

/** @return {Promise<void>} */
API.Core.SetPreferences = function(key, newValue) {
  return new Promise((resolve, reject) => {
    API.Core.PostCommandCsrf( "set-preference", $.param({ name: key }), { value: JSON.stringify(newValue) } )
      .then( ({data}) => { resolve(); } )
      .catch( (err) => { reject(err); } );
  });
}

/** @return {Promise<PlainObject>} */
API.Core.LoadLanguage = function(lang) {
  return new Promise((resolve, reject) => {
    API.Core.PostCommand( "load-language", {}, { module : "core", lang } )
      .then( ({data}) => { resolve(data); } )
      .catch( (err) => { reject(err); } );
  })
}


/* * * * * * * * * *   Preferences   * * * * * * * * * */

var Preferences = {};

/** @return {Promise<PlainObject>} */
Preferences.Load = function() {
  return new Promise((resolve, reject) => {
    API.Core.GetAllPreferences()
      .then( (data) => {
        Preferences.values = data;
        resolve(data);
      })
			.catch( (err) => {
        console.log(err);
        var errorMessage = Core.i18n('core-index/prefs-loading-failed', err.toString());
				Core.alertDialog(errorMessage);
				reject(err);
			});
  });
}

Preferences.getValue = function(key, defaultValue) {
  if(!Object.prototype.hasOwnProperty.call(Preferences.values,key)) { return defaultValue; }

  return Preferences.values[key];
}

/** @return {Promise<void>} */
Preferences.setValue = function(key, newValue) {
	return new Promise((resolve, reject) => {
		API.Core.SetPreferences(key, newValue)
			.then( () => { Preferences.values[key] = newValue; resolve(); } )
			.catch( (err) => { Core.alertDialog("Can save value."); reject(err); } );
	});
}


/* * * * * * * * * *   Languages   * * * * * * * * * */

var Languages = {};

Languages.i18n = function(key, defaultValue) {
  if(!key && Core.Debugging) { console.log("Error: Core.i18n() failed. No key."); }

  var translatedMessage = $.i18n(key);

  if(translatedMessage == "" || translatedMessage == key) {
    if(Core.Debugging) { console.log("Error: $.i18n() failed. No key: "+ key); }

    translatedMessage = defaultValue ? defaultValue : key;
  }

  return translatedMessage;
}

Languages.Load = function() {
  return new Promise((resolve, reject) => {
    API.Core.LoadLanguage()
    .then( (data) => {
			Languages.dictionary = data['dictionary'];
			Languages.lang = data['lang'];
			resolve();
		})
    .catch( (err) => {
      var m = err.message
      if (err.reqInfo) m += ` (in ${err.reqInfo})`
      var errorMessage = Core.i18n('core-index/langs-loading-failed', m);
      Core.alertDialog(errorMessage);
      reject(err);
    });
  });
}

Languages.setDefaultLanguage = function() {
  Languages.lang = (navigator.language || navigator.userLanguage).split("-")[0];
  // Languages.Load();

  $.i18n().load(Languages.dictionary, Languages.lang);
  $.i18n().locale = Languages.lang;
}

Languages.deDupUserMetaData = function(arrObj)  {
    var result = _.uniq(JSON.parse(arrObj), function(x){
        return x.name;
    });

    return JSON.stringify(result).replace(/"/g, '"');
}

Languages.setDefaultLanguage();
Languages.Load();

/* * * * * * * * * *       UI       * * * * * * * * * */

var preferenceUIs = [];

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

function onLoad() { Preferences.Load().then( (data) => { populatePreferences(); }); }

$(onLoad);
