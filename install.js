#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp');
var nugget = require('nugget')
var goenv = require('go-platform')
var extract = require('extract-zip')
var targz = require('tar.gz')
var version = require('./package.json').version
var ipfs = require('./')

checkPlatform(goenv) // make sure we can do this.

// hacky hack hack to work around unpublishability
version = version.replace(/-[0-9]+/, "")

var filename = 'go-ipfs_v'+ version +'_' + goenv.GOOS + '-' + goenv.GOARCH + (goenv.GOOS=="windows"?".zip":".tar.gz");
//                 v0.4.2   /go-ipfs_v   0.4.2     _    linux         -    amd64           .tar.gz
var url = 'https://dist.ipfs.io/go-ipfs/v'+version+"/" + filename

var bin = path.dirname(ipfs)
var tmp = path.join(__dirname, 'tmp')
var installPath = path.join(bin, 'ipfs')
var zipfile = path.join(tmp, filename)

function move() {
  // move ipfs binary into place.
  fs.rename(path.join(tmp, "go-ipfs", "ipfs"), installPath, function(err) {
    if (err) return onerror(err)

    // remove zip from disk
    fs.unlink(zipfile, function(err) {
      if (err) return onerror(err)

    })
  })
}

// mk tmp dir
mkdirp(tmp, function(err) {
  if (err) onerror(err)

  // download binary
  nugget(url, {target: filename, dir: tmp, resume: true, verbose: true}, function (err) {
    if (err) return onerror(err)

    if (filename.endsWith(".zip")) {
      // extract zip
      extract(zipfile, {dir: tmp}, function (err) {
        if (err) return onerror(err)
        move();
      })
    } else if (filename.endsWith(".tar.gz")) {
      var read=fs.createReadStream(zipfile);
      var write = targz().createWriteStream(tmp);
      read.pipe(write);
      write.on("end",function() {
        move();
      });
    } else {
      throw new Error("Format not supported");
    }
  })
})

function onerror (err) {
  if (err) throw err
}

function checkPlatform(goenv) {
  switch (goenv.GOOS) {
  case "darwin":
  case "linux":
  case "freebsd":
  case "windows":
    break

  default:
    throw new Error("no binary available for os:" + goenv.GOOS)
  }

  switch (goenv.GOARCH) {
  case "amd64":
  case "386":
  case "arm":
    break

  default:
    throw new Error("no binary available for arch: " + goenv.GOARCH)
  }
}
