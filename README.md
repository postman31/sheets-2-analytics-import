# Easy Import From Google Sheets to Google Analytics

This repository includes Apps Script files to simplify work with Google Analytics data uploads. This app is suggested to run as Google Sheets addon. It creates easy-to-edit file from your historical data and sends it to Google Analytics. The sheet also stores all uploads in readable format to make checks or overwrites.
## 1. Installation
Create a blank spreadsheet in Google Sheets. Give it a nice and easy to recall name. Go to `Tools > Script Editor`. You'll be brought to the Apps Script Editor with Code.gs open and some initial code. Paste the content of [Code.gs](https://github.com/postman31/sheets-2-analytics-import/blob/master/Code.gs) to the editor instead of initial code and save. You'll be prompted to give a name to the project.
Then go to `File > New > HTML file` and create two files: prompt.html and index.html. Paste the [respective](https://github.com/postman31/sheets-2-analytics-import/blob/master/prompt.html) [content](https://github.com/postman31/sheets-2-analytics-import/blob/master/index.html) to the files and save.
Go back to the sheet and refresh. After few seconds you'll see `Analytics import` item in your Sheets menu.
## 2. Usage
### 2.1 Permissions
Go to `Analytics Import - Manage uploads`. With the first run you'll be prompted to authorize  the script and give permissions to your drive and analytics. Please note that Drive will show you a 'This app isn't verified' warning. You'll need to click 'Advanced', and then 'Go to (project name)' to proceed.

![warning](https://github.com/postman31/sheets-2-analytics-import/blob/master/restricstions.png)

Then you'll need to enable Analytics API for your project. Go to `Resources > Advanced Google services...` and turn on *Google Analytics API*. Make sure to click on *These services must also be enabled in the Google API Console.* link in this dialog and then click *Enable APIs and Services* to enable Analytics API (You'll need to search for Analytics API). Note that this script relies on Analytics API but not on the Analytics Reporting API.

### 2.2 Schemas
You'll need to create Custom Data Source to be able to import any data to your Analytics properties. To do so go to Admin section of Analytics, choose the property and click `Data Import` at the bottom.
When you're ready with Data Sources all the available sources will be listed in the sidebar. You'll need to save Data Import Schema of the respective sources to the script to proceed. To do that go back to `Analytics > Admin > (choose your property) > Data Import` and then click the Data Source from the list. You'll see the data Data Source description. Select the text below 'Data Set schema' and copy it:

![schema](https://github.com/postman31/sheets-2-analytics-import/blob/master/schema.png)

Back to the sheet. Select the source from the list and click `Add Schema`. Save the copied text through the dialog. When the schema is saved the source list will be refreshed.
### 2.3 Uploading data.
Select the property and the view in the sidebar to prepare fetch 0 values report so you can add your values and upload it back. You can set the data Back days data range and include non-zero cost data if you want to overwrite this. The report will include the sessions metric for reference.
After modifying the values check the data integrity and send it to analytics with `Send Data` button. When ready, your uploaded data will appear in the `processed uploads` sheet.
