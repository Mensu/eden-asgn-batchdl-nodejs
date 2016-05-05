#### Please feel free to fork the repository, create new issues as well as make pull requests. Thanks in advance for all your participation!

# Thanks to

- [``DaddyTrap``](https://github.com/DaddyTrap/eden_clone_codes) who inspired me as well to have a try
- [``ieb``](https://github.com/iebb/eden-asgn-batchdl-nodejs) who has laid a solid foundation for my later development and from whom this repository is forked

# New Features
 - **auto mode**: fetch your unfinished assignments automatically without inputting your username and password
 - **store your username and password** locally
 - **multiple id input** supported
 - download **standard answer binaries**
 - **polish latest submission output** so that it becomes more convenient to read and utilize  
     [``byproduct: eden-submission-output-polisher``](https://github.com/Mensu/eden-submission-output-polisher)

# Downloaded Contents

- Description and Hint
- Standard Answer Binaries **(new!)**
- Your Answer (basis)
- Unlocked Standard Answer
- polished Latest Submission Output **(new!)**

# Precompiled Binaries

There are some precompiled binaries ( by using ``enclose``)

[``Windows-32bit``](https://github.com/Mensu/eden-asgn-batchdl-nodejs/releases/download/v0.3-alpha.1/Downloader-Win32.exe)
``19.9 MB``

[``Windows-64bit``](https://github.com/Mensu/eden-asgn-batchdl-nodejs/releases/download/v0.3-alpha.1/Downloader-Win64.exe)
``25.2 MB``

[``Mac-64bit``](https://github.com/Mensu/eden-asgn-batchdl-nodejs/releases/download/v0.3-alpha.1/Downloader-Mac64)
``29.5 MB``

[``Ubuntu-64bit``](https://github.com/Mensu/eden-asgn-batchdl-nodejs/releases/download/v0.3-alpha.1/Downloader-Ubuntu64)
``31.3 MB``

You only need to execute it

# Suggestions on running

- on Windows ( suppose the downloader is located in D:\eden\ )  
 **Note: It is highly recommended that you run the executable binaries under an *ASCII-only* path on Windows.**  
\>\> Create a .bat file containing
 
~~~
cd /d "D:\eden"
Downloader-Win64.exe
pause
~~~
save it as ``run.bat`` and double click to run

- on Mac ( suppose the downloader is located in /Users/$USER/Downloads/ )  
\>\> Create a .sh file containing

~~~
cd "/Users/$USER/Downloads"
./Downloader-Mac64
~~~
save it as ``run.sh``, use ``sudo chmod +x ./run.sh /Users/$USER/Downloads/Downloader-Mac64`` before having it run on terminal (double click to run is possible as well)  

- on Ubuntu ( suppose the downloader is located in /home/$USER/Downloads/ )  
\>\> Create a .sh file containing

~~~
gnome-terminal -x bash -c "cd '/home/$USER/Downloads'; ./Downloader-Ubuntu64; printf 'Please press Enter to continue'; read"
~~~
save it as ``run.sh``, use ``sudo chmod +x ./run.sh /home/$USER/Downloads/Downloader-Ubuntu64`` before having it run on terminal (double click to run is possible as well)  

# Run Source Code on node.js

[``node.js``](https://nodejs.org/en/) is required.

~~~
node dl.js
~~~

## Install node.js on Windows

[``download nodejs v5.10.1 for windows``](https://nodejs.org/dist/v5.10.1/node-v5.10.1-x64.msi)

## Install node.js on Ubuntu

~~~
curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install nodejs
~~~

# Details

1. When you fetch **unfinished** assignments automatically, the folders of all the assignments **are labelled "[unfinished]"**
2. When you fetch assignments **by ids**, the folders of the optional assignments **are labelled "[optional]"**
3. If the standard answer is unlocked, the standard answer's codes are downloaded in a **folder named "Standard Answer"**
4. If the **hard due has passed**, the **latest submission codes**, if any, regardless of its grade, are downloaded
5. If there are any submissions whose grades are *positive and have yet to reach full marks*, **the  latest one's polished output** is downloaded. Otherwise, no latest submission outputs are generated
6. Auto mode = [login with the **first** account stored locally] + [fetch **unfinished** assignments] + [download standard answer binaries **on Win64 and Linux64**]
7. If you choose to store usernames and passwords locally, there is generated a file **.usersdata**, which stores usernames and passwords in json
  1. username and password will be asked whether to store when they are used to login successfully
  2. If the username and password combination stored locally is wrong, it will get removed


-------

-------

# the original README file

# eden-asgn-batchdl-nodejs

* Eden Assignment Batch Downloader in Node.js
* Downloading All Unfinished Assignments on [eden.sysu.edu.cn](http://eden.sysu.edu.cn/)
* License: GPL v3
* Inspired by https://github.com/DaddyTrap/eden_clone_codes

--------

## Binaries

#### Precompiled Binaries

There are some precompiled binaries (using ``enclose``) for you:

[``windows-32bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-win32.exe)
``19.7 MiB``

[``windows-64bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-win64.exe)
``24.9 MiB``

[``ubuntu1404-64bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-ubuntu64)
``31.9 MiB``

You only need to execute it.

#### Compile Yourself

To Compile using ``enclose``:

	npm install
	npm install -g enclose
	enclose dl.js
	
=======
## Source

Need [node.js](https://nodejs.org/en/ "Node.js") to run. [[download v5.10.1 for windows]](https://nodejs.org/dist/v5.10.1/node-v5.10.1-x64.msi)

Install Dependencies: ``npm install`` (one-time).

Run: ``npm start`` or ``node dl.js``.

#### Windows Alternative

Install Dependencies: ``install.bat`` (one-time).

Run: ``run.bat``.
