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


var theLang = (navigator.language|| navigator.userLanguage).split("-")[0];
var langDictionary = "";

var thePreferences = {
  "userLang": theLang
};

var PreferencesUtils = {
};

PreferencesUtils.loadPreferences = function(f, fError) { 
  $.ajax({
    url : "command/core/get-all-preferences",
    type : "POST",
    async : false,
    data : {
      module : "core"
    },
    success : function(data) {
      thePreferences = data;
      if(f != null) f();
    }
  }).fail(function( jqXhr, textStatus, errorThrown ) {
    if(fError != null) fError(); else alert( textStatus + ':' + errorThrown );
  });
}

PreferencesUtils.loadLanguages = function() { 
  $.ajax({
    url : "command/core/load-language?",
    type : "POST",
    async : false,
    data : {
      module : "core"
    },
    success : function(data) {
      langDictionary = data['dictionary'];
      theLang = data['lang'];
      $.i18n().load(langDictionary, theLang);
      $.i18n().locale = theLang;
    }
  });
}

PreferencesUtils.getPreference = function(key, defaultValue) { 
  if(!thePreferences.hasOwnProperty(key)) { return defaultValue; }

  return thePreferences[key];
};

PreferencesUtils.setPreference = function(key, newValue) { 
  thePreferences[key] = newValue;

  Refine.wrapCSRF(function(token) {
    $.ajax({
      async: false,
      type: "POST",
      url: "command/core/set-preference?" + $.param({ name: key }),
      data: {
        "value" : JSON.stringify(newValue), 
        csrf_token: token
      },
      success: function(data) { },
      dataType: "json"
    });
  });
};

PreferencesUtils.setLocale = function() {
  $.i18n().locale = PreferencesUtils.getPreference("userLang", theLang);
};

PreferencesUtils.errorLoadingPreferences = function() {
  var errorMessage = $.i18n('core-index/prefs-loading-failed');
  
  alert(errorMessage);
};

PreferencesUtils.loadLanguages();
PreferencesUtils.loadPreferences(PreferencesUtils.setLocale, PreferencesUtils.errorLoadingPreferences);

// $.i18n().load(langDictionary, theLang);

// End internationalization
