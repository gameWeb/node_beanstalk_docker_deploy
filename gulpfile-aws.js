var gulp = require('gulp');
var runSequence = require('run-sequence');
var AWS = require('aws-sdk');
var shell = require('gulp-shell');
var env = require('gulp-env');
var awspublish = require('gulp-awspublish');
var gutil = require('gulp-util');
//var microDefinition = require('./microserviceDefinition.json');
var microservice = require('./microservice');
module.exports.microservice = microservice;

gutil.log(gutil.colors.blue.inverse('[MICROSERVICE]:\n' + JSON.stringify(microservice, null, '\t')));

//
// AWS.ElasticBeanstalk utility functions
//

var createEbApp = function (eb, appOpts, done) {
    req = eb.createApplication(appOpts, function (err, data) {
        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + JSON.stringify(response.data)));
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });
};

var createAppVersion = function (eb, appVer, done) {
    gutil.log(gutil.colors.yellow('[DEBUG]:\n' + JSON.stringify(appVer)));
    req = eb.createApplicationVersion(appVer, function (err, data) {
        if (err) {
            gutil.log(gutil.colors.red('[FAILED]:\n' + err, err.stack)); // an error occurred
        }
        else {
            gutil.log(gutil.colors.green('[SUCCESS]:\n' + data)); // an error occurred
        }
        done();
    });
};

var createAppBucket = function (name, done) {
    var params = {
        Bucket: name, /* required */
        ACL: 'authenticated-read'
    };

    var s3 = new AWS.S3();
    s3.createBucket({Bucket: name, ACL:'public-read-write'}, function (err, data) {
        //gutil.log(gutil.colors.yellow('[DEBUG]: s3data=' ), data);
        if (err) {
            if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
        }
        return data.Location;
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + "Created bucket at "),
            gutil.colors.blue(JSON.stringify(response.data)))
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });
};

var updateEnvironment = function (eb, env, done) {
    gutil.log(gutil.colors.yellow('[DEBUG]:\n' + JSON.stringify(env)));
    eb.updateEnvironment(env, function (err, data) {
        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + JSON.stringify(response.data)));
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });
    done();
};

// **************************************************
// Gulp task for AWS interactions
// **************************************************
/**
 * Intital setup of the Elastic Beanstalk Application based on the microserice configuration
 */
gulp.task('create-eb-app', ['setup-ebs'], function (done) {
    var app_params = {
        ApplicationName: microservice.definition.elasticbeanstalk.ebAppName, /* required */
        Description: microservice.definition.ebAppDesc
    };
    createEbApp(ebs, app_params, done)
});
/**
 * Create a new S3 bucket for storing archive versions for this microservice
 */
gulp.task('create-app-bucket', ['setup-aws-env'], function (done) {
    createAppBucket(microservice.definition.s3.bucket);
    done();
});

/**
 *
 */
gulp.task('create-eb-app-version', ['setup-ebs'], function (done) {
    var appParams = {
        ApplicationName: microservice.definition.elasticbeanstalk.ebAppName, /* required */
        VersionLabel: microservice.version(), /* required */
        Description: microservice.version(),
        SourceBundle: {
            S3Bucket: microservice.definition.s3.bucket,
            S3Key: microservice.archiveName('.zip')
        }
    };
    createAppVersion(ebs, appParams, done)
});


gulp.task('load-eb-app-version', ['setup-ebs'], function (done) {
    var params = {
        EnvironmentName: microservice.definition.elasticbeanstalk.ebEnvName, /* required */
        VersionLabel: microservice.version(),
        Description: 'updated with ' + microservice.version()
    };
    updateEnvironment(ebs, params, done);

});

//gulp.task('debug-eb', ['setup-ebs'], function (done) {
//    var env_params = {
//        EnvironmentId: 'e-pxzcf3p5yta',
//        EnvironmentName: 'ocapimyhapi-enva'
//    };
//    ebs.describeEnvironmentResources(env_params, function (err, data) {
//        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
//    }).on('success', function (response) {
//        gutil.log(gutil.colors.green('[SUCCESS]:' + JSON.stringify(response.data)));
//    }).on('error', function (response, err) {
//        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
//    });
//
//    var envopt_params = {
//        ApplicationName: 'ocapimyhapi1',
//        EnvironmentName: 'ocapimyhapi-env1'
//    };
//
//    ebs.describeConfigurationSettings(envopt_params, function (err, data) {
//        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
//    })
//
//
//    var app_params = {
//        ApplicationName: 'test_docker_node_app', /* required */
//        Description: 'Testing creation of a docker node app'
//    };
//
//    // createEbApp(ebs,app_params, done)
//
//    //var desc_params = {
//    //    ApplicationNames: [
//    //        'test_docker_node_app', /* required */
//    //    ]
//    //};
//    //ebs.describeApplications(desc_params, function(err, data) {
//    //    if (err) console.log(err, err.stack); // an error occurred
//    //    else     console.log(data);           // successful response
//    //});
//});

gulp.task('publish-app-version', ['setup-aws-env'], function (done) {
    gutil.log(gutil.colors.yellow('[DEBUG]: bucket=' + JSON.stringify(microservice.definition.s3.bucket)));
    try {
        var publisher = awspublish.create({bucket: microservice.definition.s3.bucket});
        console.log(JSON.stringify(publisher));
        gutil.log(gutil.colors.yellow('[DEBUG]: archive =' + microservice.archiveName('.zip')));
        gulp.src(microservice.archiveName('.zip'))
            .pipe(publisher.publish())
            .pipe(awspublish.reporter());

    } catch(err) {
        gutil.log(gutil.colors.red('[ERROR]: '+ err));
    }
    done();
});

var ebs; // Elastic Beanstalk SDK interface

gulp.task('setup-ebs', ['setup-aws-env'], function (done) {
    ebs = new AWS.ElasticBeanstalk(
        options = {
            region: microservice.definition.elasticbeanstalk.region
        },
        {
            apiVersion: '2010-12-01'
        }
    );
    done();
});

gulp.task('setup-aws-env', function (done) {

    gutil.log(gutil.colors.yellow.inverse('[DEBUG]:' + microservice.definition.name));
    gutil.log(gutil.colors.yellow.inverse('[DEBUG]:' + microservice.version()));
    env({
        vars: {
            AWS_PROFILE: microservice.definition.awsCredentialsProfile,
            NODE_ENV: 'developmenet'
        }
    });

    var credentials = new AWS.SharedIniFileCredentials({profile: microservice.definition.awsCredentialsProfile});
    AWS.config.credentials = credentials;
    AWS.config.update({region: 'us-east-1'});

    var tasks = [];
    tasks.push('echo NODE_ENV = $NODE_ENV');
    tasks.push('echo AWS_PROFILE = $AWS_PROFILE');
    shell.task(tasks)();
    //gutil.log(gutil.colors.yellow('[DEBUG]: env =' + JSON.stringify(process.env)));
    done();
});
/**
 * Stage files for deployment, update the patch version and zip up the
 * files into an archive.
 */
gulp.task('eb-deploy', ['setup-ebs'], function (done) {
    runSequence('create-app-bucket', 'publish-app-version', 'create-eb-app-version', 'load-eb-app-version', function () {
            done();
        });
});



