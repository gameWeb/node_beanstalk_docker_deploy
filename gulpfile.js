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
var microDefinition = require('./microserviceDefinition.json');

var deployDir = '_deploy';

var packageFileVersion = function () {
    delete require.cache[require.resolve('./package.json')]; //uncache the module
    return require('./package.json').version;
}
var archiveName = function (extension) {
    return microDefinition.elasticbeanstalk.ebAppName + '_v' + packageFileVersion() + extension;
}
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

/***
 * @function
 * @description Stage the required files into a separate folder for packaging
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

gulp.task('clean-stage', function (done) {
    clean([
        deployDir
    ], done);
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

gulp.task('build', function (done) {
    done();
});

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
    gutil.log(gutil.colors.yellow('[DEBUG]: current package.json version =' + packageFileVersion()));
    return gulp.src('./package.json')
        .pipe(bump({type: 'patch'}))
        .pipe(gulp.dest('./'));
});
gulp.task('echo-package-version', function () {
    gutil.log(gutil.colors.yellow('[DEBUG]: current package.json version =' + packageFileVersion()));
    gutil.log(gutil.colors.yellow('[DEBUG]: current package.json version =' + archiveName('.zip')));
});

// Now the deploy directory is ready to go. Zip it.
gulp.task('zip', function (done) {
    gutil.log(gutil.colors.yellow('[DEBUG]: Ziping version = ' + archiveName('.zip')));
    gulp.src(deployDir + '/*')
        .pipe(zip(archiveName('.zip')))
        .pipe(gulp.dest('./'));
    done();
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
            AWS_PROFILE: 'ocapi',
            NODE_ENV: 'developmenet'
        }
    })

    var arch = archiveName('.zip');
    console.log('arch=' + arch);

    var tasks = [];
    tasks.push('echo NODE_ENV = $NODE_ENV');
    tasks.push('echo AWS_PROFILE = $AWS_PROFILE');
    shell.task(tasks)();
    done();
});
/**
 * By default gulp will build and run server locally in debug
 */
gulp.task('default', function () {
    runSequence('build', 'debug');
});

