function myAlert(text) {
  var ui = SpreadsheetApp.getUi();
  ui.alert(text)
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Analytics Import')
      .addItem('Manage Uploads', 'manageUploads')
      .addToUi();
}


function clearUploadRows() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('upload')
  try {
    var uploadRange = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn())
    uploadRange.clear()
    return true
  } catch (e) {
    return false
  }
}


function fakeUpload(accountId, properyId, sourceId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('upload')
  if (!sheet) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('No upload sheet Found!');
    return null
  }
  var uploadRange = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn())
  var rangeValues = uploadRange.getValues();
  var exportData = rangeValues
  .map(function (row) {
    return row.join(',')
  }).join('\r\n')
  //Logger.log(exportData)
  // create blob
  var media = Utilities.newBlob(exportData)
  media.setContentType('application/octet-stream')
  var today = new Date();
  var todayDate = Utilities.formatDate(today, Session.getTimeZone(),
                                     'yyyy-MM-dd');
  media.setName(todayDate + '_auto.csv')
  var upload = Analytics.Management.Uploads.uploadData(accountId, properyId, sourceId, media)
  uploadRange.clear()
  var porcessedSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('porcessed uploads')
  if (!porcessedSheet) porcessedSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('porcessed uploads')
  var today = new Date();
  var endDate = Utilities.formatDate(today, Session.getTimeZone(),
      'yyyy-MM-dd');
  rangeValues.forEach(function(row) {
    porcessedSheet.appendRow([endDate].concat(row))
  })
  sheet.activate()
  Logger.log(upload)
}

function updateWithSchemas(sources) {
  sources.forEach(function(el,index) {
    sources[index].schema = null
  });
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('schemas')
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('schemas')
    return sources
  } else {
    var schemas = {}
    var rangeValues = sheet.getDataRange().getValues()
    Logger.log(rangeValues)
    rangeValues.forEach(function(row) {
        // suggested Schemas[source.id] = 'schema text'
        schemas[row[0]] = JSON.parse(row[1])
    })
    Logger.log(schemas)
    sources.forEach(function(el,index) {
      sources[index].schema = (schemas[el.id]) ? schemas[el.id] : null
    })
    return sources
  }
}

function promptSchema(sourceId) {
  var htmlOutput = HtmlService
      .createTemplateFromFile('prompt')
  htmlOutput.source = sourceId
  SpreadsheetApp.getUi().showModalDialog(htmlOutput.evaluate().setWidth(350).setHeight(500), 'No Schema for selected source');
  return true
}

function addSchema(sourceId, schema) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('schemas')
  if (!sheet) var sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('schemas')
  sheet.appendRow([sourceId, JSON.stringify(schema)])
  return schema
}

function listAccounts() {
  clearUploadRows()
  if (test.DATA_) return updateWithSchemas(test.DATA_)
  if (!Analytics) {
    myAlert('Analytis API is not enabled')
    return false
  }
  var accounts = Analytics.Management.AccountSummaries.list();
  // var summary = Analytics.Management.AccountSummaries.list();
  if (accounts.items && accounts.items.length) {
    var dataSources = []
    for (var i = 0; i < accounts.items.length; i++) {
      var account = accounts.items[i];

      // List web properties in the account.
      var sources = listWebProperties(account.id, account.webProperties);
      if (sources && sources.length) dataSources = dataSources.concat(sources)
    }
    if (dataSources && dataSources.length) {
      return updateWithSchemas(dataSources)
    }
  } else {
    myAlert('No Google Analytics accounts found.');
  }
}

function listWebProperties(accountId, allProperties) {
  if (allProperties) {
    var webProperties = {items: allProperties}
    } else {
      var webProperties = Analytics.Management.Webproperties.list(accountId)
    }

  if (webProperties.items && webProperties.items.length) {
    var dataSources = []
    for (var i = 0; i < webProperties.items.length; i++) {
      var webProperty = webProperties.items[i];

      // List profiles in the web property.
      var sources = listCustomDataSources(accountId, webProperty.id);
      if (sources && sources.length) {
        sources.map(function (source) {
          source.propertyName = webProperty.name
          source.profiles = webProperty.profiles
        })
        dataSources = dataSources.concat(sources)
      }
    }
    if (dataSources && dataSources.length) return dataSources
  } else {
    Logger.log('\tNo web properties found.');
    return null
  }
}

function listCustomDataSources(accountId, webPropertyId) {
  // Note: If you experience "Quota Error: User Rate Limit Exceeded" errors
  // due to the number of accounts or profiles you have, you may be able to
  // avoid it by adding a Utilities.sleep(1000) statement here.

  try {
    var sources = Analytics.Management.CustomDataSources.list(accountId,
      webPropertyId);
    if (sources.items && sources.items.length) {
      for (var i = 0; i < sources.items.length; i++) {
        var source = sources.items[i];
//        Logger.log('\t\tSource: name "%s", description "%s".', source.name,
//                   source.description);
      }
      return sources.items
    } else {
//      Logger.log('\t\tNo sources found.');
      return null
    }
  } catch (e) {
    Logger.log(e.message)
    return null
  }
}

function runReport(profileId, schema, days, nonZeroCost) {
  var daysCount = days
  if (!days) daysCount = 7
  var today = new Date();
  var oneWeekAgo = new Date(today.getTime() - daysCount * 24 * 60 * 60 * 1000);

  var startDate = Utilities.formatDate(oneWeekAgo, Session.getTimeZone(),
      'yyyy-MM-dd');
  var endDate = Utilities.formatDate(today, Session.getTimeZone(),
      'yyyy-MM-dd');

  var tableId = 'ga:' + profileId;
  var metric = schema.one + ',ga:sessions'
  var filters = 'ga:medium!@organic;ga:source!@(direct)' + (!nonZeroCost ? ';ga:adCost==0;' : ';') + 'ga:sourceMedium!@google / cpc'
  var options = {
    'dimensions': schema.all + ',' + schema.any,
    'sort': '-ga:date,ga:source',
    'include-empty-rows': true,
    'filters': filters
  };
  Logger.log(options)
  var report = Analytics.Data.Ga.get(tableId, startDate, endDate, metric,
      options);

  if (report.rows) {
    // clear the upload Sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('upload')
    if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('upload')
    sheet.clear()
    // get headers
    var headers = report.columnHeaders.map(function (header) {
      return header.name
    })
    // get rows
    var reportRows = report.rows
    // form the export
    reportRows.unshift(headers)
    Logger.log(reportRows)
    // get range 1 1 and paste
    var range=sheet.getRange(1, 1, reportRows.length, headers.length)
    range.setValues(reportRows)
    return reportRows.length - 1
  }
}

function checkHeaders(sourceId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('upload')
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  var schema
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('schemas').
  getDataRange().getValues().map(function(row) {
    if (row[0] == sourceId)
      schema = JSON.parse(row[1]).all.split(', ')
      })
  for (var i = 0; i < schema.length; i++) {
    if (header.indexOf(schema[i]) == -1) {
    myAlert(schema[i] + ' is missing in the headers. Please fix the data')
    return false
    }
  }
  if (header.indexOf('ga:sessions') !== -1) {
    // ALERT
    myAlert('Remove ga:sessions column to proceed!!')
    return false
  } else {
    return true
  }
}

function manageUploads() {
 // Display a sidebar with custom HtmlService content.
  var uploadSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('upload')
  if (!uploadSheet) var uploadSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('upload')
  uploadSheet.activate()
  var sidebarHtmlOutput = HtmlService
  .createHtmlOutputFromFile('index')
  .setTitle('Google Analytics Data Import');
  SpreadsheetApp.getUi().showSidebar(sidebarHtmlOutput);
}
var test = {}
