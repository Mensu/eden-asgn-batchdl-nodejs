var sanitize = require("sanitize-filename");
var request = require('request');
var mkdirp = require('mkdirp');
var prompt = require('prompt');
var jsdom = require('jsdom');
var util = require('util');
var path = require('path')
var fs = require("fs");
var j = request.jar();
var getDirName = path.dirname;
var request = request.defaults({
	jar: j
});

function writeFile(path, contents, cb) {
	mkdirp(getDirName(path), function(err) {
		if (err) return cb(err);
		fs.writeFile(path, contents, cb);
	});
}

function jQexec(body, cb) {
	jsdom.env({
		html: body,
		scripts: ['http://eden.sysu.edu.cn/static/js/jquery-1.8.3.min.js'],
		done: cb
	});
}

function FetchOne(Id, showId, Title, username) {
	if (Title.length) console.log("Fetching Assignment", Id, Title, "....");
	else console.log("Fetching Assignment", Id, "....");
	request.get('http://eden.sysu.edu.cn/m/ass/' + Id, function(e, r, body) {
		jQexec(body, function(err, window) {
			var $ = window.$, Title = $('.ass h1').first().text().replace(/^\s+/, '').replace(/\s+$/, '');
			var folder = "", devFile = "", isCpp = 0, i = 0;
			  // here I refer to the areas where to display and input codes as "block"

			  /* there are four cases as far as blocks are concerned */
			  	// 1. (before hard due) your answer
			  	// 2. (before hard due) your answer + standard answer
			  	// 3. (hard due passed) standard answer
			  	// 4. no blocks
			  // so I use blockTag (by checking whether it contains "hard due")
			  // to distinguish whether the first block is "your answer"(no) or "standard answer"(yes)
			var blockTag = $('#tab-nondiv-container').prev().prev().text();
			var hardDue = false, yourAnswer = false;
			if (~blockTag.indexOf('Hard due')) hardDue = true;
			if (~blockTag.indexOf('Your answer')) yourAnswer = true;
			  // the first block's blockTag is expected to be one of the two following sentences
			    // Your answer:
			        // => case 1 or case 2

			    // Hard due has passed. The standard answer is unlocked:
			        // => case 3
			    
			  // otherwise blockTag would be "" => case 4

			  // case 4: there are no code files in this page. just return
			  // it would be better to encapsulate this section as an exception
			if (!hardDue && !yourAnswer) {
				console.log("\nError: No code files exist. (the assignment id is " + Id + ")");
				console.log("  *** It is suggested that you check out whether the assignment actually exists or is in plagiarism pending.");
				return;
			}
			var optionalTag = $('.ass').get(0).childNodes[7].childNodes[0].textContent;
			if (~optionalTag.indexOf('Optional')) folder += ("[optional] ");

			  // set folder's name
			folder += sanitize(Id) + ' ' + sanitize(Title);

			var savePath = "./saved/" + username + "/" + folder + "/";
			  // deal with the first "block"
			    // array of all filenames(in label <a>): $('#tab-nondiv-container .tab a')
			$('#tab-nondiv-container .tab a').each(function() {
				var filename = "", code = "", subfolder = "";

				  // raw filename
				var w = $(this).text();

				if (~w.indexOf("cpp")) isCpp = 1;
				if (~w.indexOf('[*]')) {
					  // if the block contains the standard answer
					if (hardDue) {
						filter = " pre";
						subfolder = "Standard Answer/"
					} else {  // if the block contains your answer
						filter = " textarea";
					}
					code += "// To Be Finished\n";
					filename = sanitize(w.replace('[*]', ''));
				} else {
					  // if the block contains the standard answer
					if (hardDue) subfolder = "Standard Answer/";
					filter = " pre";
					filename = sanitize(w);
				}
				code += $($(this).attr('href') + filter).text();
				writeFile(savePath + subfolder + filename, code);
				//devFile += util.format("[Unit%d]\nFileName=%s\n", ++i, filename);
			});

			  // deal with the second block when there are both my answer block and std answer block
			  // if the second block exists 
			if ($('#tab-nondiv-containers').length == 1) {
				$('#tab-nondiv-containers .tab a').each(function() {
					var filename = "", code = "", subfolder = "Standard Answer/";
					w = $(this).text();
					if (~w.indexOf("cpp")) isCpp = 1;
					if (~w.indexOf('[*]')) filename = sanitize(w.replace('[*]', '')), code += "// To Be Finished\n";
					else filename = sanitize(w);
					code += $($(this).attr('href') + " pre").text();
					writeFile(savePath + subfolder + filename, code);
					//devFile += util.format("[Unit%d]\nFileName=%s\n", ++i, filename);
			    });
			}

			  // when hard due passes, fetch the latest submission, if any
			if (hardDue && $('.ass .dataTable a').length) {
				  // get the address of last submission before fetching the webpage
				var latestSubmissionURL = 'http://eden.sysu.edu.cn' + $('.ass .dataTable a').first().attr('href');
				request.get(latestSubmissionURL, function(e, r, body) {
					jQexec(body, function(err, window) {
						var $ = window.$;
						$('#tab-nondiv-container .tab a').each(function() {
							var filename = "", code = "";
							var w = $(this).text();
							if (~w.indexOf("cpp")) isCpp = 1;
							if (~w.indexOf('[*]')) filename = sanitize(w.replace('[*]', '')), code += "// To Be Finished\n";
							else filename = sanitize(w);
							code += $($(this).attr('href') + " pre").text();
							writeFile(savePath + filename, code);
							//devFile += util.format("[Unit%d]\nFileName=%s\n", ++i, filename);
						});
					});
				});
			}

			  // fetch Description, Hint and Latest Submission Output
			var descriptionText = "", descriptionFilename = "Description && Hint.txt";
			  // index = 0 => Description
			          // 1 => Hint
			          // 2 => Latest Submission Output (if existing)
			$('.ass > .panel').each(function(index) {
				  // deal with Description and Hint
				if (index < 2) {
					if (index == 0) descriptionText += ">>>>>>>>>>>>>>>> Description <<<<<<<<<<<<<<<<\n\n";
					if (index == 1) descriptionText += "\n\n>>>>>>>>>>>>>>>>>>> Hint <<<<<<<<<<<<<<<<<<<<\n\n";
					  // attempt to keep the format unchanged
					  // imperfect
					$("br").replaceWith("\n"), $("p").append("\n");

					descriptionText += $(this).text();
				}
				  // deal with Lastest Submission Output, if any
				    // index = 2, if hard due hasn't passed
				    // index = 5, if hard due has passed
				if (index == (2 + 3 * hardDue)) {
					var latestSubmissionOutputFilename = "Latest Graded Submission Output.txt",
						latestSubmissionURL = 'x', output = '';
					  
					  // if there exists graded submission with grade > 0
					    // if so, check whether its output is in the current page:
					    	// if so, just fetch its output in the currect page
					    	  // => case 1

					    	// else, get and visit its address to fetch its output
					    	  // => case 2
					    	  
					    // else, do nothing => case 3
					$('.ass .dataTable td').each(function(index2) {
						if (index2 > 3 && index2 % 3 == 1) {
							var latestGrade = $(this).text();
							  // case 2
							if (latestGrade == '  - ' || latestGrade == '  0 ') {
								index2 += 3;
							}
							else {  // grade which is > 0 found
								  // case 1
								if (index2 == 4) latestSubmissionURL = "";
								  // case 2
								else latestSubmissionURL = 'http://eden.sysu.edu.cn' + $(this).prev().children().attr('href');
								  
								  // break the 'each' loop
								return false;
							}
							  // not found: continue the 'each' loop
							return true;
						}
					});

					  // case 1
					if (latestSubmissionURL.length == 0) {
						output = $(this).text().replace(/    \|/g, '');
						if (output.length) writeFile(savePath + latestSubmissionOutputFilename, output);
					} else if (latestSubmissionURL.length > 1) {  // case 2
						request.get(latestSubmissionURL, function(e, r, body) {
							jQexec(body, function(err, window) {
								var $ = window.$;
								output = $('#submission-content .panel').text().replace(/    \|/g, '');
								writeFile(savePath + latestSubmissionOutputFilename, output);
							});
						});
					} else;  // case 3

					  // break the 'each' loop
					return false;
				}
			});
			writeFile("./saved/" + username + "/" + folder + "/" + descriptionFilename, descriptionText);
			
			console.log(".... Assignment", Id, "Downloaded Successfully");
			//devFile = util.format("[Project]\nFileName=Project%s.dev\nName=%s\n\
				//UnitCount=%s\nIsCpp=%d\nType=1\nVer=2\n",
				//Id, Id, $('#tab-nondiv-container .tab a').length, isCpp) + devFile;
			//writeFile("./saved/" + folder + "/Project" + Id + ".dev", devFile);
		});
	});
}
function doFetch(id, username) {
	request.get('http://eden.sysu.edu.cn/m/ass/', function(e, r, body) {
		jQexec(body, function(err, window) {
			  // if id is valid
			if (id.replace(/[^0-9]/g, '').length == 4 && id.length == 4) {
				console.log("Ready to fetch the desired assignment (id = " + id + ")");
				FetchOne(id, true, "", username);
			} else {  // fetch unfinished assignments instead
				console.log("Ready to fetch unfinished assignments");
				var $ = window.$;
				$('.item-ass a').each(function() {
					// sanitize id and title
					Id = $(this).attr('href').replace(/[^0-9]/g, '');
					Title = $(this).text().replace(/^\s+/, '').replace(/\s+$/, '');
					FetchOne(Id, false, Title, username);
				});
			}
		})
	});
}

function PromptLogin(csrf) {
	prompt.start();
	  // welcome
	console.log("\nPlease input the assignment id(optional), username and password respectively.");
	console.log("  *** Note: the assignment id should be a [four-digit] number");
	console.log("  *** If not, your unfinished assignments will be fetched instead, \n"
		+ "  *** which means that when required to input the assignment id you may\n"
	    + "  *** [simply press Enter] to skip so as to fetch your unfinished assignments");
	  // input id, username and password
	prompt.get(['id', 'username', {
		name: 'password',
		hidden: true,
		replace: '*',
		required: true
	}], function(err, result) {
		if (err) {
			return onErr(err);
		}
		console.log("logging in....");
		request.post({
			url: 'http://eden.sysu.edu.cn/m/login/',
			form: {
				'csrfmiddlewaretoken': csrf,
				'username': result.username,
				'password': result.password,
				'next': '/m/my/'
			}
		}, function(err, response, body) {
			jQexec(body, function(err, window) {
				var $ = window.$;
				if ($('.errorlist').length) {
					console.log($('.errorlist').text());
					console.log("login failed, please retry :(");
					return PromptLogin(csrf);
				} else {
					console.log("logged in!");
					doFetch(result.id, result.username);
				}
			});
		})
	});
}

request('http://eden.sysu.edu.cn/m/login/', function(e, r, body) {
	jQexec(body, function(err, window) {
		var $ = window.$;
		var csrf = $($('[name=csrfmiddlewaretoken]')[0]).val();
		PromptLogin(csrf);
	});
});