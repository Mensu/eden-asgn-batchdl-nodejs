var windows = false;
var ByEncloseJS = false;

var sanitize = require('sanitize-filename');
var request = require('request');
var mkdirp = require('mkdirp');
var prompt = require('prompt');
var jsdom = require('jsdom');
var util = require('util');
var path = require('path')
var fs = require('fs');
var j = request.jar();
var getDirName = path.dirname;
var edenRoot = 'http://eden.sysu.edu.cn';
var edenPrefix = edenRoot + '/m/';
var request = request.defaults({
  jar: j
});
var globalAutomode = false;
var globalDownloadBinaries = false;

function writeFile(path, contents, callback) {
  mkdirp(getDirName(path), function(err) {
    if (err) throw err;
    if (windows) contents = contents.replace(/\n/g, '\r\n');
    fs.writeFile(path, contents, function() {
      if (err) throw err;
      else if (callback) callback();
    });
  });
}

function jQexec(body, cb) {
  jsdom.env({
    html: body,
    scripts: [edenRoot + '/static/js/jquery-1.8.3.min.js'],
    done: cb
  });
}

function connectionFailed(err) {
  console.log("\nConnectionError: Failed to connect to eden, please try again later:(");
  console.log("  *** Lack of access to internet or Dr. Wang being updating codes \
may cause this problem. ");
  throw err;
}

function encloseJSWarning() {
  if (ByEncloseJS) console.log('\n*** WARNING: the executable is compiled by EncloseJS Evaluation version with \
considerable limitations on process working time. Some assignments and binaries are likely to \
fail to be downloaded completely due to these limitations if too many assignments are required \
at a time. In this case we suggest you download the source code and run it on nodejs. \
You might want to check out the README file on our GitHub (https://github.com/Men\
su/eden-asgn-batchdl-nodejs) for more information.\n');
}

function downloadFile(url, dest, callback) {
  mkdirp(getDirName(dest), function(err) {
    if (err) throw err;
    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);
    // verify response code
    sendReq.on('response', function(response) {
      if (response.statusCode !== 200)
        return callback('Response status was ' + response.statusCode);
    });
    // check for request errors
    sendReq.on('error', function (err) {
      fs.unlink(dest);
      if (callback) return callback(err.message);
    });
    sendReq.pipe(file);
    file.on('finish', function() {
      file.close(callback);  // call callback after close completes.
    });
    file.on('error', function(err) {  // Handle errors
      fs.unlink(dest); // Delete the file async.
      if (callback) return callback(err.message);
    });
  });
};


function fetchCodeFromCurrentPage(editable, $, selector, savePath, subfolder, callback) {
                              // editable: [*] is editable or not
                                        // $: the $ of the current page  
  var length = $(selector).length;
  $(selector).each(function(index) {
    var filename = "", code = "", filter = " pre";
      // raw filename
    var w = $(this).text();
    //if (~w.indexOf("cpp")) isCpp = 1;
    if (~w.indexOf('[*]')) {
      if (editable) filter = " textarea";
      code += "// To Be Finished\n", filename = sanitize(w.replace('[*]', ''));
    } else {
      filename = sanitize(w);
    }
    code += $($(this).attr('href') + filter).text();
    writeFile(savePath + subfolder + filename, code, function() {
      if (index == length - 1 && callback) {callback();}
    });
    //devFile += util.format("[Unit%d]\nFileName=%s\n", ++i, filename);
  });
}


function fetchSecondBlock($, savePath, callback) {
                       // $: the $ of current page
  if ($('#tab-nondiv-containers').length == 1)
      // if there exists the second block => it must be the standard answer
    fetchCodeFromCurrentPage(false, $, '#tab-nondiv-containers .tab a', savePath,
                            'Standard Answer/', function() {
      if (callback) callback();
    });
  else if (callback) callback();  // if there is no second block => quit
}


// DHL: Description, Hint and Latest Submission Output
function fetchDHL($, hardDue, savePath, callback) {
              // $: the $ of current page
  // index = 0 => Description
          // 1 => Hint
          // 2 or 5 => Latest Submission Output (if any)
  var length = $('.ass > .panel').length;
  var descriptionText = "", descriptionFilename = "Description & Hint.txt";
  $("br").replaceWith("\n"), $("p").append("\n");
  $('.ass > .panel').each(function(index) {
    if (index < 2) {
        // deal with Description and Hint
      if (index == 0) descriptionText += ">>>>>>>>>>>>>>>> Description <<<<<<<<<<<<<<<<\n\n";
      if (index == 1) descriptionText += "\n\n>>>>>>>>>>>>>>>>>>> Hint <<<<<<<<<<<<<<<<<<<<\n\n";
      descriptionText += $(this).text();
        // index = 1 => ready to save the Description & Hint file now
      if (index == 1) writeFile(savePath + descriptionFilename, descriptionText);
        // go on with the loop
      return true;
    }
    // deal with Latest Submission Output, if any
      // index = 2, if hard due hasn't passed
      // index = 5, if hard due has passed
    if (index == (2 + 3 * hardDue)) {
      fetchLatestSubmissionOutput($, $(this), hardDue, savePath, function() {
        if (callback) callback();
      });
        // break the loop
      return false;
    }
  });
    // if there is no latest submission, just call callback
  if ((2 + 3 * hardDue) >= length && callback) callback();
}


function fetchCodeFromSubmissionRecord(url, savePath, subfolder, Id, callback) {
// visit the submission record page and fetch the code in that page
  request.get(url, function(e, r, body) {
    if (e) connectionFailed(e);
    jQexec(body, function(err, window) {
      var $ = window.$;
      fetchCodeFromCurrentPage(false, $, '#tab-nondiv-container .tab a', savePath,
                                '', function() {
        if (callback) callback();
      });
    });
  });
}


function fetchLatestSubmissionAfterHardDue($, hardDue, Id, savePath, callback) {
                            // $: the $ of current page
  if (hardDue && $('.ass .dataTable a').length) {
      // if the hard due has passed and there exist any submissions
    var latestSubmissionURL = edenRoot + $('.ass .dataTable a').first().attr('href');
    fetchCodeFromSubmissionRecord(latestSubmissionURL, savePath, "", Id, function() {
      if (callback) callback();
    });
  }
  else if (callback) callback();
}


function fetchLatestSubmissionOutput($, self, hardDue, savePath, callback) {
                                // $: the $ of current page
                                   // self: the block that contains the latest
                                   //       submission output in the current page
  var latestSubmissionOutputFilename = "Latest Graded Submission Output.txt",
    latestSubmissionURL = 'x', output = '';
      // 'x' for case 3: do nothing

    // if there exists graded submission with grade > 0:
      // check whether its output is in the current page:
          // if so, just fetch its output in the current page => case 1
          // else, get and visit its address to fetch its output => case 2
    // else, do nothing => case 3

  $('.ass .dataTable td').each(function(index) {
    if (index > 3 && index % 3 == 1) {
      var latestGrade = $(this).text();
      if (latestGrade == '  - ' || latestGrade == '  0 ') {
          // skip '-' and '0' which are not > 0
          // case 2: go on searching for its address
        index += 3;
      } else {
          // grade that is > 0 found
          // case 1: in the current page
        if (index == 4) latestSubmissionURL = "";
          // case 2: get the corresponding page's address
        else latestSubmissionURL = edenRoot + $(this).prev().children().attr('href');
          // break the loop
        return false;
      }
        // grade that is > 0 not found: go on with the loop
      return true;
    }
  });

    // case 1: in the current page
  if (latestSubmissionURL.length == 0) {
      // make it convenient for the user to get test input
    output = self.text().replace(/    \|/g, '');
      // if output is not empty, save
    if (output.length) writeFile(savePath + latestSubmissionOutputFilename,
                                  output, function() {
        if (callback) callback();
      });
    } else if (latestSubmissionURL.length > 1) {
      // case 2: visit the corresponding page
    request.get(latestSubmissionURL, function(e, r, body) {
      if (e) connectionFailed(e);
      jQexec(body, function(err, window) {
        var $ = window.$;
          // make it convenient for the user to get test input
        output = $('#submission-content .panel').text().replace(/    \|/g, '');
          // if output is not empty, save
        if (output.length) writeFile(savePath + latestSubmissionOutputFilename,
                                      output, function() {
          if (callback) callback();
        });
      });
    });
  } else if (callback) callback();  // case 3: do nothing
}


function downloadStandardAnswerBinaries(Id, savePath, callback) {
  if (!globalDownloadBinaries) return callback();
  var subfolder = 'Standard Answer Binaries/', filename = 'a.out';
  downloadFile(edenPrefix + 'linux64/' + Id, savePath + subfolder + 'linux64-'
                + filename, function() {
    downloadFile(edenPrefix + 'win64/' + Id, savePath + subfolder + 'win64-'
                  + filename, function() {
      if (globalAutomode)
        return callback();
      else
        downloadFile(edenPrefix + 'win32/' + Id, savePath + subfolder
                      + 'win32-' + filename, function() {
        // seems that linux 32bit compiler on eden has been out of work
        //downloadFile(edenPrefix + 'linux32/' + Id, savePath + subfolder + 'linux64-' + filename, function() {callback();});
        callback();
      });
    });
  });
}


function FetchOne(Id, finished, Title, username) {
  if (Title.length) console.log("Fetching Assignment", Id, Title, "....");
  else console.log("Fetching Assignment", Id, "....");
  request.get(edenPrefix + 'ass/' + Id, function(e, r, body) {
    if (e) connectionFailed(e);
    jQexec(body, function(err, window) {
      var $ = window.$, Title = $('.ass h1').first().text().replace(/^\s+/, '').replace(/\s+$/, '');
      var folder = "", devFile = "", isCpp = 0, i = 0;

    /* ---- the code below consists of two parts: [set flags], [get codes] ---- */

        /* ---- Here we begin to set flags before fetching codes ---- */
        // we refer to the areas where to display and input codes as "block"
        // there are four cases as far as blocks are concerned
          // 1. (before hard due) your answer
          // 2. (before hard due) your answer + standard answer
          // 3. (hard due passed) standard answer
          // 4. no blocks
        // so we use (first block's) blockTag (by checking whether it contains "hard due")
        // to distinguish whether the first block is "your answer"(no) or "standard answer"(yes)

      var blockTag = $('#tab-nondiv-container').prev().prev().text();
      var hardDue = false, yourAnswer = false;
      if (~blockTag.indexOf('Hard due')) hardDue = true;
      if (~blockTag.indexOf('Your answer')) yourAnswer = true;

        // the (first block's) blockTag is expected to be one of the two following statements
          // Your answer:                                          => case 1 or case 2
          // Hard due has passed. The standard answer is unlocked: => case 3
        // otherwise blockTag would be "" => case 4

        // case 4: there are no code files in this page. just return
        // it would be better to encapsulate this section as an exception
      if (blockTag.length == 0) {
        console.log("\nError: No code files exist. (the assignment id is " + Id + ")");
        console.log("  *** It is suggested that you check out whether the assignment actually exists, \
is being graded, or is in plagiarism pending.");
        return;
      }

        // set the path to save codes and the folder's name
      var optionalTag = $('.ass').get(0).childNodes[7].childNodes[0].textContent;
      if (~optionalTag.indexOf('Optional')) folder += ("[optional] ");
        // set folder's name
      if (!finished) folder += "[unfinished] ";
      folder += sanitize(Id) + ' ' + sanitize(Title);

      var savePath = "./saved/" + username + "/" + folder + "/";
        // case 3: after hard due => standard answer => not editable
      var editable = ((hardDue) ? false : true);
      var subfolder = ((hardDue) ? 'Standard Answer/' : '');


        /* ---- Here we begin to fetch codes ---- */
        // case 1, 2, 3: deal with the first "block"
      fetchCodeFromCurrentPage(editable, $, '#tab-nondiv-container .tab a', savePath, subfolder, function() {
          // case 2: deal with the second block, if any
        fetchSecondBlock($, savePath, function() {
            // deal with Description, Hint and Latest Submission Output
          fetchDHL($, hardDue, savePath, function() {
              // deal with the latest submission
            fetchLatestSubmissionAfterHardDue($, hardDue, Id, savePath, function() {
                // download binaries
              downloadStandardAnswerBinaries(Id, savePath, function() {
                console.log('  ... Assignment ' + Id + ' downloaded successfully');
              });
            });
          });
        });
      });
      
      //devFile = util.format("[Project]\nFileName=Project%s.dev\nName=%s\n\
        //UnitCount=%s\nIsCpp=%d\nType=1\nVer=2\n",
        //Id, Id, $('#tab-nondiv-container .tab a').length, isCpp) + devFile;
      //writeFile("./saved/" + folder + "/Project" + Id + ".dev", devFile);
    });
  });
}


function fetchUnfinished(username) {
  request.get(edenPrefix + 'ass/', function(e, r, body) {
    if (e) connectionFailed(e);
    jQexec(body, function(err, window) {
        var $ = window.$;
        if ($('.item-ass a').length > 6) encloseJSWarning();
        $('.item-ass a').each(function() {
            // sanitize id and title
          Id = $(this).attr('href').replace(/[^0-9]/g, '');
          Title = $(this).text().replace(/^\s+/, '').replace(/\s+$/, '');
          FetchOne(Id, false, Title, username);
        });
    });
  });
}


function UsersData(filename, callback) {
    // this => *this && public
  this.data = {"users": []};
  this.total = 0;
  var self = this;
  UsersData.prototype.readDataFrom = function(filename, callback) {
      // this => the same as in UsersData (*this && public)
    fs.exists(filename, function(exist) {
        // this => the function's *this, not the same as in UsersData!!
        // that's why we use self instead
      if (!exist) {
          // create an empty usersData object
        self.data = {"users": []};
        self.total = self.data.users.length;
        if (callback) callback();
      } else {
          // read the file
        fs.readFile(filename, 'utf-8', function(err, rawData) {
          if (err) throw err;
          else {
              // create a usersData object from the file
            self.data = JSON.parse(rawData);
            self.total = self.data.users.length;
            if (callback) callback();
          }
        });
      }
    });
  };
  UsersData.prototype.writeDataTo = function(filename, callback) {
    fs.writeFile('./' + filename, JSON.stringify(this.data), function() {
      if (callback) callback();
    });
  };
  UsersData.prototype.listUsernames = function() {
    for (var i = 0; i < this.total; ++i) {
      console.log('[' + (parseInt(i) + parseInt(1)) + ']', this.data.users[i].username);
    }
  };
  UsersData.prototype.findAccountByUsername = function(username) {
    for (var i = 0; i < this.total; ++i) {
      if (username == this.data.users[i].username) return i;
    }
      // not found: return a new index which makes it convenient to create new accounts
    return this.total;
  };
  UsersData.prototype.addAccount = function(username, password) {
    this.data.users[this.findAccountByUsername(username)] = {
      "username": username,
      "password": password
    }
    ++(this.total);
  };
  UsersData.prototype.getAccountByListedIndex = function(index) {
    if (1 <= index && index <= this.total) return this.data.users[index - 1];
    else return false;
  };
  UsersData.prototype.removeAccountByUsername = function(username, callback) {
    this.data.users[this.findAccountByUsername(username)]
      = this.data.users[this.total - 1];
    this.data.users[this.total - 1] = {"username": "", "password": ""};
    --(this.total);
    if (callback) callback();
  }
  this.readDataFrom(filename, function() {
      // this => the function's *this, not the same as in UsersData!!
      // call UsersData's callback
    if (callback) callback(undefined, self);
  });
}

function getAssignmentsId(username) {
  if (globalAutomode) {
    fetched = true;
    console.log('Ready to fetch unfinished assignments.');
    return fetchUnfinished(username);
  }
  prompt.start();
  console.log("Please input the assignment id");
  console.log('or [simply press Enter] to fetch unfinished assignments');
  console.log('  *** Note: a valid assignment id is a [four-digit] number like 6910');
  console.log('  *** multiple ids are allowed like 6910 6911 6912, with ids separated by spaces');
  console.log('  *** you may also input a "u" as an id to fetch unfinished assignments,');
  console.log('  *** like 6910 u 2035    => 6910, unfinished ones and 2035 will be fetched');
  prompt.get([{
    name: 'id',
    type: 'string',
    before: function(id) {return id.split(' ');}
  }], function(err, result) {
    if (err) throw err;
    var fetched = false;  // flag for unfinished assignments
    var rawId = result.id, count = 0;
      // simply press Enter => fetch unfinished assignments
    if (rawId.length == 1 && rawId[0] == '') {
      fetched = true;
      console.log('Ready to fetch unfinished assignments.');
      return fetchUnfinished(username);
    }
    for (i in rawId) {
      var oneId = rawId[i];
      if (!fetched && oneId.match(/^u$/)) {
          // id is u => fetch unfinished assignments
        fetched = true;
        console.log('Ready to fetch unfinished assignments.');
        fetchUnfinished(username);
      } else if (oneId.match(/^(\d){4}$/)) {
          // id is valid => fetch the desired assignment
        ++count;
        if (count == 4) encloseJSWarning();
        console.log('Ready to fetch the desired assignments (id = ' + oneId + ')');
        FetchOne(oneId, true, "", username);
      } else if (oneId != '') {  // else => ignore
        console.log('invalid id "' + oneId + '" ignored');
      }
    }
      // no valid id input
    if (count == 0 && !fetched) {
      console.log('Bad input! Please try again...');
      getAssignmentsId(username);
    }
  });
}

function loginEden(csrf, fromData, username, password, usersData) {
  console.log("Logging in....");
  request.post({
    url: edenPrefix + 'login/',
    form: {
      'csrfmiddlewaretoken': csrf,
      'username': username,
      'password': password,
      'next': '/m/my/'
    }
  }, function(e, response, body) {
    if (e) connectionFailed(e);
    jQexec(body, function(err, window) {
      var $ = window.$;
      if ($('.errorlist').length) {
        var incorrectCombi = false;  // incorrect username and password combination
        var errorText = $('.errorlist').text();
        if (~errorText.indexOf('a correct username and password')) {
          incorrectCombi = true;
        }
        console.log(errorText, "\nLogin failed, please retry :(");
        if (fromData && incorrectCombi) {
            // combination from usersData is wrong => remove the wrong record
          usersData.removeAccountByUsername(username, function() {
              // and choose again
            return chooseAccount(csrf, usersData);
          });
        } else return chooseAccount(csrf, usersData);  // directly choose again
      } else {
        console.log("Logged in with username", username);
        if (fromData) {
            // login with the combination from usersData => get Id directly
          getAssignmentsId(username);
        } else {
            // login with the user-input combination
            //   => allow user to store the new combination
          prompt.start();
          console.log('Would you like to store the username and password locally?');
          prompt.get([{
            name: 'store',
            description: '[y/n]'
          }], function(err, result) {
            if (err) throw err;
            if (result.store == 'y' || result.store == 'Y' || result.store == 'yes'
                || result.store == 'Yes' || result.store == 'YES') {  // yes
              usersData.addAccount(username, password);
              usersData.writeDataTo('.usersdata', function(err) {
                if (err) {
                  console.log(err.what(), '\nfailed to store\n');
                  getAssignmentsId(username);
                }
                console.log('... successfully stored\n');
                getAssignmentsId(username);
              });
            } else {  // not to store
              console.log('Not stored\n');
              getAssignmentsId(username);
            }
          });
        }
      }
    });
  });
}

function getUsernameAndPassword(csrf, chosenUser, usersData) {
   prompt.start();
  if (chosenUser.password) {  // username and password from the chosen account
    loginEden(csrf, true, chosenUser.username, chosenUser.password, usersData);
  } else {
    prompt.get(['username', {
      name: 'password',
      hidden: true,
      replace: '*',
      required: true
    }], function(err, result) {
      if (err) throw err;
        // username and password from user input
      return loginEden(csrf, false, result.username, result.password, usersData);
    });
  }
}

function chooseAccount(csrf, usersData) {
  var total = usersData.total;
  if (total == 0) {  // no usersdata stored locally => obtain username and password from user
    getUsernameAndPassword(csrf, {'username': '', 'password': ''}, usersData);
  } else {
    console.log("Please choose an account listed below to login by [inputting its index],");
    console.log("or [simply press Enter] so as to input username and password by yourself\n");
    usersData.listUsernames();
    prompt.start();
    prompt.get([{
      name: 'choice',
      type: 'string',
    }], function(err, result) {
      if (err) throw err;
      if (result.choice == '') {
          // simply press Enter => obtain username and password from user
        return getUsernameAndPassword(csrf, {'username': '', 'password': ''}, usersData);
      } else if (1 <= parseInt(result.choice) && parseInt(result.choice) <= total) {
          // valid index => obtain username and password from the chosen account
        return getUsernameAndPassword(csrf, usersData.getAccountByListedIndex(parseInt(result.choice)), usersData);
      } else {  // invalid index => choose again
        console.log("Error: Invalid index detected. Please try again with a valid index.");
        return chooseAccount(csrf, usersData);
      }
    });
  }
}


function chooseAutomode(callback) {
  prompt.start();
  console.log('Would you like to access auto mode? [simply press Enter] to access!');
  console.log('  *** In auto mode, we will use the first account stored locally to \
fetch the unfinished assignments and download binaries executable on Win64 and Linux64');
  prompt.get([{
    name: 'automode',
    description: '[y/n]'
  }], function(err, result) {
    if (err) throw err;
    if (result.automode == '' || result.automode == 'y' || result.automode == 'Y' || result.automode == 'yes'
        || result.automode == 'Yes' || result.automode == 'YES') {
      console.log('Auto mode started!');
      return callback(undefined, true);
  } else {
    console.log('Access usual mode.');
    return callback(undefined, false);
  }
  });
}


function chooseDownloadBinaries(callback) {
  prompt.start();
  console.log('Would you like to download standard answer binaries?');
  if (ByEncloseJS) console.log('  *** WARNING: this feature is likely to fail to \
work properly on precompiled binaries if there are too many assignments to download.');
  prompt.get([{
    name: 'binaries',
    description: '[y/n]'
  }], function(err, result) {
    if (err) throw err;
    if (result.binaries == 'y' || result.binaries == 'Y' || result.binaries == 'yes'
        || result.binaries == 'Yes' || result.binaries == 'YES') {
      console.log('We will try our best to download binaries.');
      return callback(undefined, true);
    } else {
      console.log('Binaries will not get downloaded.');
      return callback(undefined, false);
    }
  });
}

function options(csrf, usersData) {
  var total = usersData.total;
  if (total == 0) {  // no usersData stored locally => no automode is not available
    chooseDownloadBinaries(function(err, downloadBinaries) {
      if (downloadBinaries) globalDownloadBinaries = downloadBinaries;
      chooseAccount(csrf, usersData);
    });
  } else {
    chooseAutomode(function(err, automode) {
      if (automode) {
        globalDownloadBinaries = true, globalAutomode = true;
        loginEden(csrf, true, usersData.data.users[0].username,
                  usersData.data.users[0].password, usersData);
      }
      else chooseDownloadBinaries(function(err, downloadBinaries) {
        if (downloadBinaries) globalDownloadBinaries = downloadBinaries;
        chooseAccount(csrf, usersData);
      });
    }); 
  }
}

function welcome(csrf, usersData) {
  console.log("Welcome!");
    // allow the user to choose an account stored locally, if any
  options(csrf, usersData);
}

request(edenPrefix + 'login/', function(err, response, body) {
  if (err) connectionFailed(err);
  jQexec(body, function(err, window) {
    var $ = window.$;
    var csrf = $($('[name=csrfmiddlewaretoken]')[0]).val();
    new UsersData('.usersdata', function(err, self) {
      welcome(csrf, self);
    });
  });
});


