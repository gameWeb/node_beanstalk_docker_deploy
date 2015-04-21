var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var runSequence = require('run-sequence');
var clean = require('del');
var bump = require('gulp-bump');
var zip = require('gulp-zip');
var shell = require('gulp-shell');
var env = require('gulp-env');
var gutil = require('gulp-util');
var gulpAWS = require('./gulpfile-aws');

var deployDir = '_deploy';

/***
 * Increate the minor version number for the application in it's package.json
 * @returns {*} Gulp stream
 */
var rollMinorVersion = function () {
    return gulp.src('./package.json')
        .pipe(bump({type: 'minor'}))
        .pipe(gulp.dest('./'));
}
/***
 * Increate the major version number for the application in it's package.json
 * @returns {*} Gulp stream
 */
var rollMajorVersion = function () {
    return gulp.src('./package.json')
        .pipe(bump({type: 'minor'}))
        .pipe(gulp.dest('./'));
}

/**
 * Bump the minor version of the package.json
 */
gulp.task('update-minor-version', function () {
    return rollMinorVersion();
});

/**
 * Bump the patch version of the package.json
 */
gulp.task('update-patch-version', function () {
    gutil.log(gutil.colors.yellow('[DEBUG]: current package.json version =' + gulpAWS.microservice.version()));
    return gulp.src('./package.json')
        .pipe(bump({type: 'patch'}))
        .pipe(gulp.dest('./'));
});

/**
 * Echo the current Package version and associated archive file name
 */
gulp.task('echo-package-version', function () {
    gutil.log(gutil.colors.yellow('[DEBUG]: current package.json version = ' + gulpAWS.microservice.version()));
    gutil.log(gutil.colors.yellow('[DEBUG]: current package.json version = ' +  gulpAWS.microservice.archiveName('.zip')));
});

/***
 * Create an archive of the deploy directory
 */
gulp.task('zip', function (done) {
    gutil.log(gutil.colors.yellow('[DEBUG]: Ziping version = ' + gulpAWS.microservice.archiveName('.zip')));
    gulp.src(deployDir + '/*')
        .pipe(zip( gulpAWS.microservice.archiveName('.zip')))
        .pipe(gulp.dest('./'));
    done();
});

/***
 * Stage the required files into a separate folder for packaging
 */
gulp.task('stage-files', function (done) {
    gulp.src('./.dockerignore')
        .pipe(gulp.dest(deployDir));
    gulp.src('./Dockerfile')
        .pipe(gulp.dest(deployDir));
    gulp.src('./package.json')
        .pipe(gulp.dest(deployDir));
    gulp.src('./server.js')
        .pipe(gulp.dest(deployDir));
    done();
});

gulp.task('clean-archives', function (done) {
    clean([
        gulpAWS.microservice.definition.elasticbeanstalk.ebAppName+"*.zip"
    ], function(err, deletedFiles){
        gutil.log(gutil.colors.yellow('[DEBUG]: removed ',deletedFiles.join('\n')));
        done();
    });
});

gulp.task('clean-stage', function (done) {
    clean([
        deployDir,
    ], function(err, deletedFiles){
        gutil.log(gutil.colors.yellow('[DEBUG]: removed ',deletedFiles.join('\n')));
        done();
    });
});

/**
 * Stage files for deployment, update the patch version and zip up the
 * files into an archive.
 */
gulp.task('stage', ['setup-env', 'clean-stage'], function (done) {
    runSequence('stage-files', 'update-patch-version', 'zip', function () {
        done();
    });
});

/**
 * start a local docker instance via docker compose
 */
gulp.task('dc-start', function (done) {
    var tasks = [];
    tasks.push('docker-compose start nodesvr');
    shell.task(tasks)();
    done();
});

gulp.task('setup-env', function (done) {
    env({
        vars: {
            NODE_ENV: 'developmenet'
        }
    })

    var tasks = [];
    tasks.push('echo NODE_ENV = $NODE_ENV');
    shell.task(tasks)();
    done();
});

gulp.task('test', function () {
    nodemon({
        script: 'server.js'
        , env: {'NODE_ENV': 'test'}
    });
});


gulp.task('debug', function () {
    nodemon({
        script: 'server.js'
        , env: {'NODE_ENV': 'development'}
    });
});
/**
 * By default gulp will build and run server locally in debug
 */
gulp.task('default', function () {
    runSequence('setup-env', 'echo-package-version');
});

