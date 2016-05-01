# Thanks To

- [``DaddyTrap``](https://github.com/DaddyTrap/eden_clone_codes), who inspired me to have a try at this project
- [``ieb``](https://github.com/iebb/eden-asgn-batchdl-nodejs), from whom this repository is forked

# Main Features

- Download **unfinished** assignments (basis)
- Download assignments by **id**

# Downloaded Contents

- Description and Hint
- Standard Answer Binaries **(new!)**
- Your Answer (basis)
- Unlocked Standard Answer
- Latest Submission Output

# Precompiled Binaries

There are some precompiled binaries (using ``enclose``):

[``windows-32bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-win32.exe)
``19.7 MiB``

[``windows-64bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-win64.exe)
``24.9 MiB``

[``Mac-64bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-ubuntu64)
``31.9 MiB``

[``Linux-64bit``](https://github.com/iebb/eden-asgn-batchdl-nodejs/releases/download/v0.16.4.21/downloader-ubuntu64)
``31.9 MiB``

You only need to execute it.

# Suggestions on running

- on Windows ( suppose the downloader is located in D:\eden\ )  
 **Note: It is highly recommended that you run the executable binaries under an *ASCII-only* path on Windows**  
 Create a .bat file containing
```
cd /d "D:\eden"
Downloader-Win64.exe
pause
``` 
save it as run.bat and double click to run

- on Mac ( suppose the downloader is located in /Users/$USER/Downloads/ )  
Create a .sh file containing
```
cd "/Users/$USER/Downloads"
./Downloader-Mac64
```
save it as run.sh and have it run on terminal (double click to run is possible as well)  

- on Linux ( suppose the downloader is located in /home/$USER/Downloads/ )  
Create a .sh file containing
```
cd "/home/$USER/Downloads"
gnome-terminal -x bash -c "./Downloader-Linux64; printf 'Please press Enter to continue'; read"
```
save it as run.sh and have it run on terminal (double click to run is possible as well)  

# Run with source

[``node.js``](https://nodejs.org/en/ "Node.js") is required.

```
node dl.js
```

## Install node.js on Windows

[``download nodejs v5.10.1 for windows``](https://nodejs.org/dist/v5.10.1/node-v5.10.1-x64.msi)

## Install node.js on Linux

```
curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install nodejs
```

# Details

1. When you fetch **unfinished** assignments automatically, the folders of all the assignments **are labelled "[unfinished]"**
2. When you fetch assignments **by id**, the folders of the optional assignments **are labelled "[optional]"**
3. If the standard answer is unlocked, the standard answer's codes are downloaded in a **folder named "Standard Answer"**
4. If the **hard due has passed**, the **latest submission codes**, if any, regardless of its grade, are downloaded
5. If there are any submissions whose grades are positive or None, **the latest one's output** is downloaded. Otherwise, no latest submission outputs are generated


-------

------

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
