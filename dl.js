var windows32 = false;
var windows = false;
var ByEncloseJS = false;
var chinese = false;

var sanitize = require('sanitize-filename');
var request = require('request');
var mkdirp = require('mkdirp');
var prompt = require('prompt');
var jsdom = require('jsdom');
var util = require('util');
var path = require('path');
var fs = require('fs');
var j = request.jar();
var getDirName = path.dirname;
var edenRoot = 'http://zion.sysu.edu.cn';
var edenPrefix = edenRoot + '/m/';
var usersdataFilename = '.usersdata';
var request = request.defaults({
  jar: j
});
var globalAutomode = false;
var globalDownloadBinaries = false;


function writeFile(path, contents, callback) {
  mkdirp(getDirName(path), function(err) {
    if (err) {
      if (callback) return console.log('', err.message), callback(err);
      else throw err;
    }
    if (windows) contents = contents.replace(/\n/g, '\r\n');
    fs.writeFile(path, contents, function(err) {
      if (err) {
        if (callback) return console.log('', err.message), callback(err);
        else throw err;
      }
      else if (callback) return callback(null);
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

function connectionFailed() {
  if (chinese) {
    console.log("\n连接错误: 无法连接到Eden，请稍后再试:(");
    console.log("  *** 这可能是因为您的电脑没有连网，或者王老师正在更新代码。");
  } else {
    console.log("\nConnectionError: Failed to connect to Eden, please try again later:(");
    console.log("  *** Lack of access to internet or Dr. Wang being updating codes \
may cause this problem. ");
  }
}

function encloseJSWarning() {
  if (ByEncloseJS) {
    if (chinese) console.log('\n*** 警告: 该可执行文件由EncloseJS免费版编译，在进程工作时间\
方面有较大的限制。因此，若一次性下载过多作业，有些作业的代码和标程二进制文件很有可能无法完整下载。\
此时我们建议您下载该程序的源代码并在nodejs上运行。您可以查看Github上的README文件来获取更多信息。\n');
    else console.log('\n*** WARNING: the executable is compiled by EncloseJS Evaluation version with \
considerable limitations on process working time. Some assignments and binaries are likely to \
fail to be downloaded completely due to these limitations if too many assignments are required \
at a time. In this case we suggest you download the source code and run it on nodejs. \
You might want to check out the README file on our GitHub (https://github.com/Men\
su/eden-asgn-batchdl-nodejs) for more information.\n');
  }
}

function downloadFile(url, dest, callback) {
  mkdirp(getDirName(dest), function(err) {
    if (err) {
      if (callback) return console.log('', err.message, '\n  ... Error occurred when downloading ' + dest), callback(err);
      else throw err;
    }
    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);
    // verify response code
    sendReq.on('response', function(response) {
      if (response.statusCode !== 200)
        return console.log('', 'Response status was ' + response.statusCode, '\n  ... Error occurred when downloading ' + dest), callback(new Error('Bad Response status' + response.statusCode));
    });
    // check for request errors
    sendReq.on('error', function(err) {
      fs.unlink(dest);
      if (callback) return console.log('', err.message, '\n  ... Error occurred when downloading ' + dest), callback(err);
    });
    sendReq.pipe(file);
    file.on('finish', function() {
      file.close(callback);  // call callback after close completes.
    });
    file.on('error', function(err) {  // Handle errors
      fs.unlink(dest); // Delete the file async.
      if (callback) return console.log('', err.message, '\n  ... Error occurred when downloading ' + dest), callback(err);
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
    writeFile(savePath + subfolder + filename, code, function(err) {
      if (index == length - 1 && callback) {callback(err);}
    });
    //devFile += util.format("[Unit%d]\nFileName=%s\n", ++i, filename);
  });
}


function fetchSecondBlock($, savePath, callback) {
                       // $: the $ of current page
  if ($('#tab-nondiv-containers').length == 1)
      // if there exists the second block => it must be the standard answer
    fetchCodeFromCurrentPage(false, $, '#tab-nondiv-containers .tab a', savePath,
                            'Standard Answer/', function(err) {
      if (callback) return callback(err);
    });
  else if (callback) return callback(null);  // if there is no second block => quit
}


// DHL: Description, Hint and Latest Submission Output
function fetchDHL($, hardDue, savePath, callback) {
              // $: the $ of current page
  // index = 0 => Description
          // 1 => Hint
          // 2 or 5 => Latest Submission Output (if any)
  var length = $('.ass > .panel').length;
  var descriptionText = "", descriptionFilename = "Description & Hint.txt";
  var error = null;
  $("br").replaceWith("\n"), $("p").append("\n");
  $('.ass > .panel').each(function(index) {
    if (index < 2) {
        // deal with Description and Hint
      if (index == 0) descriptionText += ">>>>>>>>>>>>>>>> Description <<<<<<<<<<<<<<<<\n\n";
      if (index == 1) descriptionText += "\n\n>>>>>>>>>>>>>>>>>>> Hint <<<<<<<<<<<<<<<<<<<<\n\n";
      descriptionText += $(this).text();
        // index = 1 => ready to save the Description & Hint file now
      if (index == 1) writeFile(savePath + descriptionFilename, descriptionText, function(err) {
        if (err) error = err;
      });
        // go on with the loop
      return true;
    }
    // deal with Latest Submission Output, if any
      // index = 2, if hard due hasn't passed
      // index = 5, if hard due has passed
    if (index == (2 + 3 * hardDue)) {
      fetchLatestSubmissionOutput($, $(this), hardDue, savePath, function(err) {
        if (callback) callback(err);
      });
        // break the loop
      return false;
    }
  });
    // if there is no latest submission, just call callback
  if ((2 + 3 * hardDue) >= length && callback) return callback(error);
}


function fetchCodeFromSubmissionRecord(url, savePath, subfolder, Id, callback) {
// visit the submission record page and fetch the code in that page
  request.get(url, function(e, r, body) {
    if (e) {
      connectionFailed(e);
      if (callback) return callback(e);
    }
    jQexec(body, function(err, window) {
        var $ = window.$;
        fetchCodeFromCurrentPage(false, $, '#tab-nondiv-container .tab a', savePath,
                                  '', function(err) {
          if (callback) return callback(err);
        });
      });
  });
}


function fetchLatestSubmissionAfterHardDue($, hardDue, Id, savePath, callback) {
                            // $: the $ of current page
  if (hardDue && $('.ass .dataTable a').length) {
      // if the hard due has passed and there exist any submissions
    var latestSubmissionURL = edenRoot + $('.ass .dataTable a').first().attr('href');
    fetchCodeFromSubmissionRecord(latestSubmissionURL, savePath, "", Id, function(err) {
      if (callback) return callback(err);
    });
  }
  else if (callback) return callback(null);
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
    output = polishSubmissionOutput(self.text());
      // if output is not empty, save
    if (output.length) writeFile(savePath + latestSubmissionOutputFilename,
                                  output, function(err) {
        if (callback) return callback(err);
      });
    else if (callback) return callback(null);
  } else if (latestSubmissionURL.length > 1) {
      // case 2: visit the corresponding page
    request.get(latestSubmissionURL, function(e, r, body) {
      if (e) {
        connectionFailed(e);
        if (callback) return callback(e);
      }
      jQexec(body, function(err, window) {
          var $ = window.$;
            // make it convenient for the user to get test input
          output = polishSubmissionOutput($('#submission-content .panel').text());
            // if output is not empty, save
          if (output.length) writeFile(savePath + latestSubmissionOutputFilename,
                                        output, function(err) {
              if (callback) return callback(err);
            });
          else if (callback) return callback(null);
        });
    });
  } else if (callback) return callback(null);  // case 3: do nothing
}


function downloadStandardAnswerBinaries(Id, savePath, callback) {
  if (!globalDownloadBinaries) return callback(null);
  var subfolder = 'Standard Answer Binaries/', filename = 'a.out';
  var error = null;
  downloadFile(edenPrefix + 'linux64/' + Id, savePath + subfolder + 'linux64-'
                + filename, function(err) {
    if (err) error = err;
    if (!windows32) downloadFile(edenPrefix + 'win64/' + Id, savePath + subfolder + 'win64-'
                  + filename, function(err) {
        if (err) error = err;
        if (globalAutomode) {
          if (callback) return callback(error);
        } else downloadFile(edenPrefix + 'win32/' + Id, savePath + subfolder
                      + 'win32-' + filename, function(err) {
            if (err) error = err;
          // seems that linux 32bit compiler on eden has been out of work
          //downloadFile(edenPrefix + 'linux32/' + Id, savePath + subfolder + 'linux64-' + filename, function() {callback();});
            return callback(error);
          });
      });
    else downloadFile(edenPrefix + 'win32/' + Id, savePath + subfolder + 'win32-'
                  + filename, function(err) {
        if (err) error = err;
        if (globalAutomode) {
          if (callback) return callback(error);
        } else downloadFile(edenPrefix + 'win64/' + Id, savePath + subfolder
                        + 'win64-' + filename, function(err) {
            if (err) error = err;
            return callback(error);
          });
      });
  });
}

function polishSubmissionOutput(rawData) {
  var splitData = rawData.split('\n'), polishedData = '';
    // flags we need in full marks judgment
  var toJudgeFullmark = false, fullmark = true;
  var beforeGoogleStyle = true, beforeStandard = true, beforeMemory = true;
  var afterExecRandom = false;

    // flags for borders and substring's startindex
    // border: +-------------
  var isBorder = false, borderToEncounter = 0;
  var start = 0;

    // flags we need in input polish mode
  var toPolishInput = false, isTestInput = false;

    // flags we need in linenum addition mode
                          // isYSOutput: is either 'Your program's stdout output:' or 'Standard answer's stdout output:'
  var toAddLinenum = false, isYSOutput = false;
  var linenum = 0;

    // deal with data line by line
  for (i in splitData) {

      // when we are out of linenum addition mode:
      // if the line starts with '     Your program's stdout output:' or '     Standard answer's stdout output:'
      //    and the block below needs linenum
    if (!toAddLinenum && (afterExecRandom || (splitData[i + 2] && splitData[i + 2].match(/^    \|/)))
      && splitData[i].match(/^((     Y)|(     S))/)) {
        // enter polish linenum addition mode
      toAddLinenum = true, isYSOutput = true;
      borderToEncounter = 2, linenum = 1;
    }
      // access linenum addition mode
    if (toAddLinenum) {
      isBorder = splitData[i].match(/^    \+--/);
        // if the line is a border
      if (isBorder) --borderToEncounter, isYSOutput = false;
      var nonContent = isBorder || isYSOutput;
                          // if the line is output content => generate linenum for it
                          // else => no linenum generated
      var linenumString = ((nonContent) ? '' : ('00' + (linenum++)).slice(-3));
      var start = ((nonContent) ? 0 : 3);
                        // if the line is non-content => start from index #0
                        // else the line must contain output content => start from index #3
      polishedData += (linenumString + splitData[i].substring(start) + '\n');

        // if we have encountered two borders, namely no more borders to encounter
        //   => quit linenum addition mode
      if (!borderToEncounter) toAddLinenum = false;
      continue;
    }

/* --------- demo ----------
first we explain how to get formatted linenum with ('00' + (linenum++)).slice(-3)
It's a pity that I failed to find a printf-like function in nodejs that supports %0*d
so I found a workaround:
  if linenum is a one-digit number, say 5, ('00' + (linenum++)) would be '005'
~~~~~~~~~~~~~~~
(-3)(-2)(-1)
 0   0   5
~~~~~~~~~~~~~~~
   *** we start from index #-3 and obtain '005' as a result


  if linenum is a two-digit number, say 43, ('00' + (linenum++)) would be '0043'
~~~~~~~~~~~~~~~
(-4)(-3)(-2)(-1)
 0   0   4   3
~~~~~~~~~~~~~~~
   *** we start from index #-3 and obtain '043' as a result


Now we show how we cope with the data below:
0123456
     Your program's stdout output:
0123456
    +---------------------------------------------------------------------
0123456
    |{}
0123456
    |is empty set: 0
0123456
    |append: 1
0123456
    |append: 1
0123456
    |{-3202, 3054}
0123456
    |append: 0
0123456
    |{-3202, 3054}
0123456
    |is empty set: 0
0123456
    |remove: 1
0123456
    |{3054, 4001, 4794, 5985}
0123456
    |remove: 0
0123456
    |{3054, 4001, 4794, 5985}
0123456
    |
0123456
    +---------------------------------------------------------------------
0123456


Case 1: If the line is non-content (Your output, Standard output, or borders +----...)
~~~~~~~~~~~~~~~~~~~~
0123456
     Your program's stdout output:
0123456
~~~~~~~~~~~~~~~~~~~~

   *** we keep the line intact by starting from index #0 and obtain before appending '\n'
   0123456
>>>     Your program's stdout output:<<<
   0123456

=>
     Your program's stdout output:\n


Case 2: If the line contains output data (the linenum for the line below is 2)
~~~~~~~~~~~~~~~~~~~~
0123456
    |is empty set: 0
0123456
~~~~~~~~~~~~~~~~~~~~

   *** we start from index #3 and obtain before prefixing '002' and appending '\n'
0123456
>>> |is empty set: 0<<<
0123456

=>'002' + ' |is empty set: 0' + '\n'
=>
002 |is empty set: 0\n


In this way we obtain as a result:
     Your program's stdout output:
    +---------------------------------------------------------------------
001 |{}
002 |is empty set: 0
003 |append: 1
004 |append: 1
005 |{-3202, 3054}
006 |append: 0
007 |{-3202, 3054}
008 |is empty set: 0
009 |remove: 1
010 |{3054, 4001, 4794, 5985}
011 |remove: 0
012 |{3054, 4001, 4794, 5985}
013 |
    +---------------------------------------------------------------------


*/

      // if the line starts with '     [Test input]'    (=> is actually [Test input])
      //    and we are out of input polish mode
    if (!toPolishInput && splitData[i].match(/^     \[Te/)) {
        // enter polish test input mode
      toPolishInput = true, isTestInput = true;
      borderToEncounter = 2, start = 5;
    }
      // in input polish mode
    if (toPolishInput) {
      isBorder = splitData[i].match(/^    \+/);
        // if the line is a border
      if (isBorder) --borderToEncounter, isTestInput = false;

                      // if the line is a border or [Test input] => start from index #4
                            // else, the line must contain input data => start from index #5
      polishedData += (splitData[i].substring(start - Boolean(isBorder || isTestInput)) + '\n');

  // if we have encountered two borders, namely there are no more borders to encounter
        //   => we have finished polish work in the block above => quit
      if (!borderToEncounter) toPolishInput = false;
      continue;
    }
/* -------- demo ---------
0123456
     [Test input]
0123456
    +---------------------------------------------------------------------
0123456
    |-32131 980 23131 23131 231312
0123456
    |-32 980 28981 89331 3892
0123456
    +---------------------------------------------------------------------
0123456


Case 1: If the line is [Test input]:
~~~~~~~~~~~~~~~~~~~~
0123456
     [Test input]
0123456
~~~~~~~~~~~~~~~~~~~~

   *** we start from index #4 and obtain ' [Test input]' before appending '\n'
0123456
>>>> [Test input]<<<
0123456

=>
 [Test input]\n


Case 2: If the line is a border:
~~~~~~~~~~~~~~~~~~~~
0123456
    +---------------------------------------------------------------------
0123456
~~~~~~~~~~~~~~~~~~~~

   *** we start from index #4 and obtain '+---------...' before appending '\n'
0123456
>>>>+---------------------------------------------------------------------<<<
0123456

=>
+---------------------------------------------------------------------\n


Case 3: If the line contains input data:
~~~~~~~~~~~~~~~~~~~~
0123456
    |-32131 980 23131 23131 231312
0123456
~~~~~~~~~~~~~~~~~~~~

   *** we start from index #5 and obtain input data before appending '\n'
0123456
>>>>>-32131 980 23131 23131 231312<<<
0123456

=>
-32131 980 23131 23131 231312\n


In this way we obtain as a result:
 [Test input]
+---------------------------------------------------------------------
-32131 980 23131 23131 231312
-32 980 28981 89331 3892
+---------------------------------------------------------------------

*/
    
    if (!(toPolishInput && toAddLinenum)) polishedData += (splitData[i] + '\n');
    if (toJudgeFullmark) {
      if (!splitData[i].match(/^Pass/)) fullmark = false;
      toJudgeFullmark = false;
    }
    if (beforeMemory) {
      if (!afterExecRandom) {
        if (beforeStandard) {
          if (beforeGoogleStyle) {
            if (splitData[i].match(/: check_style]/)) {
              beforeGoogleStyle = false;
              if (fullmark) toJudgeFullmark = true;
            }
          }
          if (splitData[i].match(/: execute_s/)) {
            beforeStandard = false;
            if (fullmark) toJudgeFullmark = true;
          }
        }
         if (splitData[i].match(/: execute_r/)) {
           afterExecRandom = true;
           if (fullmark) toJudgeFullmark = true;
         }
       }
      if (splitData[i].match(/: validate_m/)) {
        beforeMemory = false;
        if (fullmark) toJudgeFullmark = true;
      }
    }
  }
  return (fullmark) ? '' : polishedData;
}


function FetchOne(Id, finished, Title, username, idArray, callback) {
  if (Title.length) console.log(((chinese) ? "正在获取未完成的 Assignment" : "Fetching unfinished assignment"), Id, Title, "....");
  else console.log(((chinese) ? "正在获取 Assignment" : "Fetching assignment"), Id, "....");
  request.get(edenPrefix + 'ass/' + Id, function(e, r, body) {
    if (e) {
      connectionFailed(e);
      throw e;
    }
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
        if (chinese) {
          console.log("\n错误：页面上没有代码文件 (出错的id为" + Id + ")");
          console.log("  *** 建议您亲自登录Eden查看该作业是否真实存在、正在改分、或者被判抄袭。");
          if ($('#main font').text().indexOf('plagiarism')) console.log('  *** 提示：您的这次作业似乎被判了抄袭。');
          console.log('  ... 下载Assignment ' + Id + ' 时出错。');
        } else {
          console.log("\nError: No code files exist. (the assignment id is " + Id + ")");
          console.log("  *** It is suggested that you check out whether the assignment actually exists, \
is being graded, or is in plagiarism pending.");
          if ($('#main font').text().indexOf('plagiarism')) console.log('  *** Hint: Your assignment seems to be in plagiarism pending.');
          console.log('  ... There occurred some problems when Assignment ' + Id + ' are being downloaded.');
        }
        return;
      }

        // set the path to save codes and the folder's name
      var optionalTag = $('.ass').get(0).childNodes[7].childNodes[0].textContent;
      if (~optionalTag.indexOf('Optional')) folder += ("[opt] ");
        // set folder's name
      if (!finished) folder += "[todo] ";
      folder += sanitize(Id) + ' ' + sanitize(Title);

      var savePath = "./saved/" + username + "/" + folder + "/";
        // case 3: after hard due => standard answer => not editable
      var editable = ((hardDue) ? false : true);
      var subfolder = ((hardDue) ? 'Standard Answer/' : '');

      var error = null;
        /* ---- Here we begin to fetch codes ---- */
        // case 1, 2, 3: deal with the first "block"
      fetchCodeFromCurrentPage(editable, $, '#tab-nondiv-container .tab a', savePath, subfolder, function(err) {
        if (err) error = err;
          // case 2: deal with the second block, if any
        fetchSecondBlock($, savePath, function(err) {
          if (err) error = err;
            // deal with Description, Hint and Latest Submission Output
          fetchDHL($, hardDue, savePath, function(err) {
            if (err) error = err;
              // deal with the latest submission
            fetchLatestSubmissionAfterHardDue($, hardDue, Id, savePath, function(err) {
              if (err) error = err;
                // download binaries
              downloadStandardAnswerBinaries(Id, savePath, function(err) {
                if (err) error = err;
                if (chinese) {
                  if (error) console.log('  ... 下载 Assignment ' + Id + ' 时出错。');
                  else console.log('  ... 成功下载 Assignment ' + Id + '!');
                } else {
                  if (error) console.log('  ... There occurred some problems when Assignment ' + Id + ' are being downloaded.');
                  else console.log('  ... Assignment ' + Id + ' downloaded successfully!');
                }
                if (callback) callback(idArray);
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


function fetchAsgn(idArray) {
  var task = null;
  for (var i = 0; i < 2; ++i) {
    if (idArray.length == 0) return;
    task = idArray.pop();
    FetchOne(task[0], task[1], task[2], task[3], idArray);
  }
  if (idArray.length == 0) return;
  task = idArray.pop();
  FetchOne(task[0], task[1], task[2], task[3], idArray, fetchAsgn);
}

function fetchUnfinished(username, idArray, callback) {
  request.get(edenPrefix + 'ass/', function(e, r, body) {
    if (e) {
      connectionFailed(e);
      throw e;
    }
    jQexec(body, function(err, window) {
        var $ = window.$;
        if ($('.item-ass a').length > 6) encloseJSWarning();
        $('.item-ass a').each(function(index) {
            // sanitize id and title
          Id = $(this).attr('href').replace(/[^0-9]/g, '');
          Title = $(this).text().replace(/^\s+/, '').replace(/\s+$/, '');
          if (idArray && callback) {
            idArray.push([Id, false, Title, username]);
            if (index == $('.item-ass a').length - 1) callback(idArray);
          } else FetchOne(Id, false, Title, username);
        });
    });
  });
}

function UsersDataManager(filename, callback) {
    // this => *this && public
  this.data = {"users": []};
  this.total = 0;
  var self = this;
  UsersDataManager.prototype.readDataFrom = function(filename, callback) {
    fs.exists(filename, function(exist) {
      if (!exist) {
          // create an empty usersDataManager object
        self.data = {"users": []};
        self.total = self.data.users.length;
        if (callback) callback(null);
      } else {
          // read the file
        fs.readFile(filename, 'utf-8', function(err, rawData) {
          if (err) {
            if (callback) console.log('', err.message), callback(err);
            else throw err;
          } else {
              // create a usersDataManager object from the file
            try {  
              self.data = JSON.parse(rawData);
              self.total = 0;
              for (i in self.data.users) 
                if (self.data.users[i].username.length && self.data.users[i].password.length) ++self.total;
            } catch (e) {
              console.log('', e.name + ": " + e.message);
              if (chinese) console.log('  *** 错误：' + filename + ' 文件似乎被修改过，无法被解释器识别了。\
原来的 ' + filename + ' 文件将会在下一次储存用户名密码的时候被覆盖。');
              else console.log('  *** Error: It seems that data stored in ' + filename + ' have \
been modified and could not be recognized any more. \
The orginal ' + filename + ' file will get overwritten when \
new username and password patterns are allowed to stored.');
              self.data = {"users": []};
              self.total = self.data.users.length;
              if (callback) return callback(null);
              else throw e;
            }
            if (callback) callback(null);
          }
        });
      }
    });
  };
  UsersDataManager.prototype.writeDataTo = function(filename, callback) {
    fs.writeFile('./' + filename, JSON.stringify(this.data), function() {
      if (callback) callback(null);
    });
  };
  UsersDataManager.prototype.listUsernames = function() {
    for (var i = 0; i < this.total; ++i) {
      console.log('[' + (parseInt(i) + parseInt(1)) + ']', this.data.users[i].username);
    }
  };
  UsersDataManager.prototype.findAccountByUsername = function(username) {
    for (var i = 0; i < this.total; ++i) {
      if (username == this.data.users[i].username) return i;
    }
      // not found: return a new index which makes it convenient to create new accounts
    return this.total;
  };
  UsersDataManager.prototype.addAccount = function(username, password) {
    this.data.users[this.findAccountByUsername(username)] = {
      "username": username,
      "password": password
    }
    ++(this.total);
  };
  UsersDataManager.prototype.getAccountByListedIndex = function(index) {
    if (1 <= index && index <= this.total) return this.data.users[index - 1];
    else return {'username': '', 'password': ''};
  };
  UsersDataManager.prototype.removeAccountByUsername = function(username, callback) {
    this.data.users[this.findAccountByUsername(username)]
      = this.data.users[this.total - 1];
    this.data.users[this.total - 1] = {"username": "", "password": ""};
    --(this.total);
    this.writeDataTo(usersdataFilename, function(err) {
      if (err) {
        if (chinese) console.log('', err.message, '\n保存失败\n');
        else console.log('', err.message, '\nFailed to store\n');
        if (callback) return callback();
      }
      if (callback) return callback();
    });
  }
  this.readDataFrom(filename, function(err) {
      // call UsersDataManager's callback
    if (callback) callback(err, self);
  });
}

function getAssignmentsId(username) {
  if (globalAutomode) {
    fetched = true;
    //if (chinese) console.log('准备下载未完成的Assignment。');
    //else console.log('Ready to fetch unfinished assignments.');
    return fetchUnfinished(username, new Array(), fetchAsgn);
  }
  prompt.start();
  if (chinese) {
    console.log("请输入 Assignment id");
    console.log('或者[敲下回车]下载未完成的 Assignment');
    console.log('  *** 注意：id应该是一个四位数，像 6910');
    console.log('  *** 允许一次输入多个id，像 6910 6911 6912，用空格将id隔开');
    console.log('  *** 您也可以输入一个 "u" 代表未完成的 Assignment，');
    console.log('  *** 像 6910 u 2035  => 下载 6910、未完成的以及2035');
  } else {
    console.log("Please input the assignment id");
    console.log('or [simply press Enter] to fetch unfinished assignments');
    console.log('  *** Note: a valid assignment id is a [four-digit] number like 6910');
    console.log('  *** multiple ids are allowed like 6910 6911 6912, with ids separated by spaces');
    console.log('  *** you may also input a "u" as an id to fetch unfinished assignments,');
    console.log('  *** like 6910 u 2035  => 6910, unfinished ones and 2035 will be fetched');
  }
  prompt.get([{
    name: 'id',
    type: 'string',
    before: function(id) {return id.split(' ');}
  }], function(err, result) {
    if (err) throw err;
    var fetched = false;  // flag for unfinished assignments
    var rawId = result.id, countValidId = 0;
    var idArray = new Array();
      // simply press Enter => fetch unfinished assignments
    if (rawId.length == 1 && rawId[0] == '') {
      fetched = true;
      //if (chinese) console.log('准备下载未完成的 Assignment。');
      //else console.log('Ready to fetch unfinished assignments.');
      if (ByEncloseJS) return fetchUnfinished(username, idArray, fetchAsgn);
      else return fetchUnfinished(username);
    }
    for (i in rawId) {
      var oneId = rawId[i];
      if (!fetched && oneId.match(/^u$/)) {
          // id is u => fetch unfinished assignments
        fetched = true;
        //if (chinese) console.log('准备下载未完成的 Assignment。');
        //else console.log('Ready to fetch unfinished assignments.');
        if (ByEncloseJS) fetchUnfinished(username, idArray, fetchAsgn);
        else fetchUnfinished(username);
      } else if (oneId.match(/^(\d){4}$/)) {
          // id is valid => fetch the desired assignment
        ++countValidId;
        if (countValidId == 5) encloseJSWarning();
        //if (chinese) console.log('准备下载指定的 Assignment (id = ' + oneId + ')');
        //else console.log('Ready to fetch the desired assignment (id = ' + oneId + ')');
        //FetchOne(oneId, true, "", username);
        if (ByEncloseJS) idArray.push([oneId, true, "", username]);
        else FetchOne(oneId, true, "", username);
      } else if (oneId != '') {  // else => ignore
        if (chinese) console.log('忽略非法id "' + oneId + '"');
        else console.log('invalid id "' + oneId + '" ignored');
      }
    }
      // no valid id input
    if (countValidId == 0 && !fetched) {
      if (chinese) console.log('无效输入！请重试...');
      else console.log('Bad input! Please try again...');
      getAssignmentsId(username);
    } else if (ByEncloseJS) fetchAsgn(idArray);
  });
}

function loginEden(csrf, fromData, username, password, usersDataManager) {
  if (chinese) console.log('正在登录....');
  else console.log("Logging in....");
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
        if (chinese) console.log(errorText, "\n登录失败，请重试 :(");
        else console.log(errorText, "\nLogin failed, please retry :(");
        if (fromData && incorrectCombi) {
            // combination from usersDataManager is wrong => remove the wrong record
          usersDataManager.removeAccountByUsername(username, function() {
              // and choose again
            return chooseAccount(csrf, usersDataManager);
          });
        } else return chooseAccount(csrf, usersDataManager);  // directly choose again
      } else {
        if (chinese) console.log("用户", username, "登录成功");
        else console.log("Logged in with username", username);
        if (fromData) {
            // login with the combination from usersDataManager => get Id directly
          getAssignmentsId(username);
        } else {
            // login with the user-input combination
            //   => allow user to store the new combination
          prompt.start();
          if (chinese) console.log('是否要在本地保存用户名和密码？');
          else console.log('Would you like to store the username and password locally?');
          prompt.get([{
            name: 'store',
            description: '[y/n]'
          }], function(err, result) {
            if (err) throw err;
            if (result.store == 'y' || result.store == 'Y' || result.store == 'yes'
                || result.store == 'Yes' || result.store == 'YES') {  // yes
              usersDataManager.addAccount(username, password);
              usersDataManager.writeDataTo(usersdataFilename, function(err) {
                if (err) {
                  if (chinese) console.log('', err.message, '\n保存失败\n');
                  else console.log('', err.message, '\nFailed to store\n');
                  return getAssignmentsId(username);
                }
                if (chinese) console.log('... 保存成功\n');
                else console.log('... successfully stored\n');
                return getAssignmentsId(username);
              });
            } else {  // not to store
              if (chinese) console.log('未保存\n');
              else console.log('Not stored\n');
              return getAssignmentsId(username);
            }
          });
        }
      }
    });
  });
}

function getUsernameAndPassword(csrf, chosenUser, usersDataManager) {
   prompt.start();
  if (chosenUser.password) {  // username and password from the chosen account
    loginEden(csrf, true, chosenUser.username, chosenUser.password, usersDataManager);
  } else {
    prompt.get([{
      name: 'username',
      description: (chinese) ? '用户名' : 'username'
    }, {
      name: 'password',
      description: ((chinese) ? '密码' : 'password'),
      hidden: true,
      replace: '*',
      required: true
    }], function(err, result) {
      if (err) throw err;
        // username and password from user input
      return loginEden(csrf, false, result.username, result.password, usersDataManager);
    });
  }
}

function chooseAccount(csrf, usersDataManager) {
  var total = usersDataManager.total;
  if (total == 0) {  // no users data stored locally => obtain username and password from user
    getUsernameAndPassword(csrf, {'username': '', 'password': ''}, usersDataManager);
  } else {
    if (chinese) {
      console.log("请从下列的账号列表中，选择一个账号并输入其序号登录");
      console.log("或者[敲下回车]手动输入用户名和密码\n");
    } else {
      console.log("Please choose an account listed below to login by [inputting its index],");
      console.log("or [simply press Enter] so as to input username and password by yourself\n");
    }
    usersDataManager.listUsernames();
    prompt.start();
    prompt.get([{
      name: 'choice',
      description: (chinese) ? '序号' : 'choice',
      type: 'string',
    }], function(err, result) {
      if (err) throw err;
      if (result.choice == '') {
          // simply press Enter => obtain username and password from user
        return getUsernameAndPassword(csrf, {'username': '', 'password': ''}, usersDataManager);
      } else if (1 <= parseInt(result.choice) && parseInt(result.choice) <= total) {
          // valid index => obtain username and password from the chosen account
        return getUsernameAndPassword(csrf, usersDataManager.getAccountByListedIndex(parseInt(result.choice)), usersDataManager);
      } else {  // invalid index => choose again
        if (chinese) console.log("错误：检测到非法的序号。请重新输入一个正常的序号。");
        else console.log("Error: Invalid index detected. Please try again with a valid index.");
        return chooseAccount(csrf, usersDataManager);
      }
    });
  }
}


function chooseAutomode(callback) {
  prompt.start();
  if (chinese) {
    console.log('您打算进入自动模式吗？只需[敲下回车]即可进入！');
    console.log('  *** 在自动模式下，我们将使用本地储存的第一个账号登录Eden，下载未完成的Assignment以及能在Windows '
+ ((windows32) ? '32' : '64') + '位和Linux 64位下运行的二进制文件。');
  } else {
    console.log('Would you like to access auto mode? [simply press Enter] to access!');
    console.log('  *** In auto mode, we will use the first account stored locally to \
fetch the unfinished assignments and download binaries executable on Windows '
+ ((windows32) ? '32' : '64') + 'bit and Linux 64bit');
  }
  prompt.get([{
    name: 'automode',
    description: '[y/n]'
  }], function(err, result) {
    if (err) throw err;
    if (result.automode == '' || result.automode == 'y' || result.automode == 'Y'
      || result.automode == 'yes' || result.automode == 'Yes' || result.automode == 'YES') {
      if (chinese) console.log('开启自动模式！');
      else console.log('Auto mode started!');
      return callback(undefined, true);
  } else {
    if (chinese) console.log('进入普通模式。');
    else console.log('Access usual mode.');
    return callback(undefined, false);
  }
  });
}


function chooseDownloadBinaries(callback) {
  prompt.start();
  if (chinese) {
    console.log('您打算下载标程的二进制文件吗？');
    if (ByEncloseJS) console.log('  *** 警告：如果一次下载太多作业，下载可能会失败。');
  } else {
    console.log('Would you like to download standard answer binaries?');
    if (ByEncloseJS) console.log('  *** WARNING: this feature is likely to fail to \
work properly on precompiled binaries if there are too many assignments to download.');
  }
  prompt.get([{
    name: 'binaries',
    description: '[y/n]'
  }], function(err, result) {
    if (err) throw err;
    if (result.binaries == 'y' || result.binaries == 'Y' || result.binaries == 'yes'
        || result.binaries == 'Yes' || result.binaries == 'YES') {
      if (chinese) console.log('我们将尽量下载标程的二进制文件。');
      else console.log('We will try our best to download binaries.');
      return callback(undefined, true);
    } else {
      if (chinese) console.log('标程的二进制文件不会被下载。');
      else console.log('Binaries will not get downloaded.');
      return callback(undefined, false);
    }
  });
}

function options(csrf, usersDataManager) {
  var total = usersDataManager.total;
  if (total == 0) {  // no users data stored locally => no automode is not available
    chooseDownloadBinaries(function(err, downloadBinaries) {
      if (downloadBinaries) globalDownloadBinaries = downloadBinaries;
      chooseAccount(csrf, usersDataManager);
    });
  } else {
    chooseAutomode(function(err, automode) {
      if (automode) {
        globalDownloadBinaries = true, globalAutomode = true;
        loginEden(csrf, true, usersDataManager.data.users[0].username,
                  usersDataManager.data.users[0].password, usersDataManager);
      }
      else chooseDownloadBinaries(function(err, downloadBinaries) {
        if (downloadBinaries) globalDownloadBinaries = downloadBinaries;
        chooseAccount(csrf, usersDataManager);
      });
    }); 
  }
}

function welcome(csrf, usersDataManager) {
  if (chinese) console.log('欢迎！');
  else console.log("Welcome!");
    // allow the user to choose an account stored locally, if any
  options(csrf, usersDataManager);
}

request(edenPrefix + 'login/', function(err, response, body) {
  if (err) {
    connectionFailed(err);
    throw err;
  }
  jQexec(body, function(err, window) {
    var $ = window.$;
    if (~$('body blockquote > p').text().indexOf('王老师在更新系统代码')) {
      // connectionFailed();
      if (chinese) err = new Error('王老师正在更新代码，故无法连接到Eden。');
      else err = new Error('Failed to visit Eden because Dr. Wang is updating codes.');
    } else if (~$('body h1').text().indexOf('Server Error')) {
      connectionFailed(err);
      if (chinese) err = new Error('内部服务器错误，故无法连接到Eden。');
      else err = new Error('Failed to visit Eden because of internal server error.');
    }
    if (err) throw err;
    var csrf = $($('[name=csrfmiddlewaretoken]')[0]).val();
    new UsersDataManager(usersdataFilename, function(err, self) {
      if (err) return;
      else welcome(csrf, self);
    });
  });
});


